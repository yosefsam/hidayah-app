import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

/**
 * Applies Stripe subscription state to `profiles` + `subscriptions`.
 * Used only from trusted server routes (webhook handler).
 */
export async function syncStripeSubscriptionToSupabase(
  admin: SupabaseClient,
  sub: Stripe.Subscription
): Promise<{ userId: string | null }> {
  let userId = sub.metadata?.user_id ?? null;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

  if (!userId && customerId) {
    const { data: prof } = await admin.from("profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    userId = prof?.id ?? null;
  }

  if (!userId) return { userId: null };

  const status = sub.status;
  const tier = status === "active" || status === "trialing" ? "premium" : "free";
  const currentPeriodEndIso = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  const profilePatch = {
    stripe_customer_id: customerId ?? undefined,
    stripe_subscription_id: sub.id,
    subscription_status: status,
    subscription_tier: tier,
    is_pro: tier === "premium",
    current_period_end: currentPeriodEndIso,
  };

  const { data: updatedRows, error: profileUpdateErr } = await admin
    .from("profiles")
    .update(profilePatch)
    .eq("id", userId)
    .select("id");

  if (profileUpdateErr) {
    console.error("[stripe webhook] syncStripeSubscriptionToSupabase: profiles update error", profileUpdateErr);
  } else if (!updatedRows?.length) {
    console.warn("[stripe webhook] syncStripeSubscriptionToSupabase: no profile row, inserting stub", { userId });
    const { error: insertErr } = await admin.from("profiles").insert({ id: userId });
    if (insertErr && insertErr.code !== "23505") {
      console.error("[stripe webhook] syncStripeSubscriptionToSupabase: profiles insert failed", insertErr);
    }
    await admin.from("profiles").update(profilePatch).eq("id", userId);
  }

  await admin.from("subscriptions").upsert(
    {
      id: sub.id,
      user_id: userId,
      status,
      price_id: sub.items.data[0]?.price?.id ?? null,
      current_period_end: currentPeriodEndIso,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  return { userId };
}

