import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { getPostgresPool } from "@/lib/db/postgres-pool";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncStripeSubscriptionToSupabase } from "@/lib/stripe/syncSubscriptionToSupabase";

export const runtime = "nodejs";

function subscriptionIdFromSession(session: Stripe.Checkout.Session): string | null {
  const sub = session.subscription;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in sub) return (sub as Stripe.Subscription).id;
  return null;
}

function userIdFromCheckoutSession(session: Stripe.Checkout.Session): string | null {
  const ref = session.client_reference_id;
  if (typeof ref === "string" && ref.trim()) return ref.trim();
  const meta = session.metadata?.user_id;
  if (typeof meta === "string" && meta.trim()) return meta.trim();
  return null;
}

function checkoutSessionProfileEmail(session: Stripe.Checkout.Session): string | null {
  if (typeof session.customer_email === "string" && session.customer_email.trim()) {
    return session.customer_email.trim();
  }
  const d = session.customer_details;
  if (d && typeof d.email === "string" && d.email.trim()) return d.email.trim();
  return null;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !whSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 501 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("[stripe webhook] received event", { type: event.type, id: event.id });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.error("[stripe webhook] SUPABASE_SERVICE_ROLE_KEY is missing; webhook must use service role, not anon key");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 501 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server misconfigured" }, { status: 501 });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = userIdFromCheckoutSession(session);
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
        const stripeSubscriptionId = subscriptionIdFromSession(session);

        console.log("[stripe webhook] checkout.session.completed extracted", {
          userId: userId ?? "(missing)",
          stripeCustomerId: customerId ?? "(none)",
          stripeSubscriptionId: stripeSubscriptionId ?? "(none)",
          sessionId: session.id,
        });

        if (stripeSubscriptionId) {
          const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          await syncStripeSubscriptionToSupabase(admin, sub);
        }

        if (!userId) {
          console.error(
            "[stripe webhook] checkout.session.completed: missing user id (client_reference_id or metadata.user_id)",
            { sessionId: session.id }
          );
          break;
        }

        // Direct Postgres (node `pg`) bypasses PostgREST entirely — avoids PGRST202/PGRST205 on this write.
        const pgPool = getPostgresPool();
        if (!pgPool) {
          console.error("[stripe webhook] checkout.session.completed: DATABASE_URL missing; cannot run direct Postgres update");
          return NextResponse.json({ error: "Server misconfigured" }, { status: 501 });
        }
        const profileProUpdateSql = `UPDATE public.profiles
             SET
               is_pro = true,
               subscription_status = 'active',
               stripe_customer_id = COALESCE($2, stripe_customer_id),
               stripe_subscription_id = COALESCE($3, stripe_subscription_id),
               updated_at = now()
             WHERE id = $1`;
        const profileProParams = [userId, customerId, stripeSubscriptionId];

        try {
          console.log("Using direct Postgres query for profile update");
          let updateRes = await pgPool.query(profileProUpdateSql, profileProParams);
          if (updateRes.rowCount === 0) {
            console.warn(
              "[stripe webhook] checkout.session.completed: profile row missing, inserting then retrying update",
              { userId }
            );
            await pgPool.query(
              `INSERT INTO public.profiles (id, email)
               VALUES ($1, $2)
               ON CONFLICT (id) DO NOTHING`,
              [userId, checkoutSessionProfileEmail(session)]
            );
            updateRes = await pgPool.query(profileProUpdateSql, profileProParams);
          }
        } catch (pgErr: unknown) {
          const e = pgErr as { message?: string; code?: string };
          console.error("[stripe webhook] checkout.session.completed: direct Postgres profiles update failed", {
            message: e?.message,
            code: e?.code,
            err: pgErr,
          });
          return NextResponse.json({ error: "Profile update failed" }, { status: 500 });
        }
        console.log("[stripe webhook] checkout.session.completed: profiles update success", { userId });
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const uid = sub.metadata?.user_id ?? null;
        console.log("[stripe webhook] subscription event extracted", {
          type: event.type,
          userIdFromMetadata: typeof uid === "string" && uid ? uid : "(missing)",
          subscriptionId: sub.id,
        });

        const { userId } = await syncStripeSubscriptionToSupabase(admin, sub);
        if (!userId) {
          console.error("[stripe webhook] subscription sync: could not resolve Supabase user id", {
            type: event.type,
            subscriptionId: sub.id,
          });
        } else {
          console.log("[stripe webhook] subscription sync success", { userId, type: event.type });
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook] handler error", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
