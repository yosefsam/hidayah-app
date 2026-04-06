import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserSubscriptionStatus } from "@/lib/subscription/getUserSubscriptionStatus";
import { getFreeDailyReaderLimit } from "@/lib/subscription/freeTierLimits";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 501 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("user_reading_state").select("*").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const subscription = await getUserSubscriptionStatus(user.id);

  const limit = getFreeDailyReaderLimit();
  const today = new Date().toISOString().slice(0, 10);
  let freeUsage: { used: number; limit: number } | null = null;
  if (!subscription.isPro) {
    const { data: usageRow } = await supabase
      .from("free_usage_daily")
      .select("reader_visits")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();
    const used = Number(usageRow?.reader_visits ?? 0) || 0;
    freeUsage = { used, limit };
  }

  return NextResponse.json({ ...data, subscription, freeUsage });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 501 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;
  const row = {
    user_id: user.id,
    visited_pages: body.visited_pages as number[] | undefined,
    completed_pages: body.completed_pages as number[] | undefined,
    last_read_page: body.last_read_page as number | undefined,
    streak: body.streak,
    sessions: body.sessions,
    bookmarks: body.bookmarks,
    reader_preferences: body.reader_preferences,
    today_progress: body.today_progress as number | undefined,
    today_status: body.today_status as string | undefined,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("user_reading_state").upsert(row, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
