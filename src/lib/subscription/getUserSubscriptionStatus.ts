import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { coerceProfileIsPro } from "@/lib/subscription/coerceProfileIsPro";

export type UserSubscriptionStatus = {
  isPro: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
};

/**
 * Pro access is determined solely by `public.profiles.is_pro` (Stripe webhook updates this row).
 * Uses the caller's Supabase client (user JWT + RLS).
 */
export async function getUserSubscriptionStatusWithClient(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSubscriptionStatus> {
  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("is_pro,subscription_status,current_period_end")
    .eq("id", userId)
    .maybeSingle();
  if (profErr) throw profErr;

  const rawIsPro = prof?.is_pro;
  const isPro = coerceProfileIsPro(rawIsPro);
  const currentPeriodEnd = prof?.current_period_end ?? null;

  if (process.env.NODE_ENV === "development") {
    console.log("[DB] getUserSubscriptionStatusWithClient", {
      userId,
      rawProfile: prof,
      rawIsPro,
      computedIsPro: isPro,
    });
  }

  return {
    isPro,
    status: (prof?.subscription_status ?? null) as string | null,
    currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd).toISOString() : null,
  };
}

/**
 * Server-side helper with service role (bypasses RLS). Same source of truth as the user-scoped path.
 */
export async function getUserSubscriptionStatus(userId: string): Promise<UserSubscriptionStatus> {
  const admin = createAdminClient();
  if (!admin) {
    return { isPro: false, status: null, currentPeriodEnd: null };
  }

  const { data: prof, error: profErr } = await admin
    .from("profiles")
    .select("is_pro,subscription_status,current_period_end")
    .eq("id", userId)
    .maybeSingle();
  if (profErr) throw profErr;

  const rawIsPro = prof?.is_pro;
  const isPro = coerceProfileIsPro(rawIsPro);
  const currentPeriodEnd = prof?.current_period_end ?? null;
  return {
    isPro,
    status: (prof?.subscription_status ?? null) as string | null,
    currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd).toISOString() : null,
  };
}
