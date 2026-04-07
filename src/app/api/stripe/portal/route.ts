import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";

export async function POST() {
  const stripe = getStripe();
  const supabase = await createClient();
  if (!stripe || !supabase) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Billing portal is not available. Server configuration is incomplete." },
      { status: 501 }
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[stripe portal] profiles lookup failed", profileError);
    return NextResponse.json({ error: "Could not load your billing profile. Try again later." }, { status: 500 });
  }

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      {
        error:
          "No Stripe customer on file. Subscribe to Pro first; after checkout you can manage billing here.",
      },
      { status: 400 }
    );
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${getSiteUrl()}/profile`,
  });

  return NextResponse.json({ url: portal.url });
}
