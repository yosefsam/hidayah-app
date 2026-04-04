import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE_NAME } from "@/lib/demo-cookie";
import { isLikelySupabaseProjectMismatch, resolveSupabasePublicEnv } from "@/lib/supabase/env";
import { getFreeDailyReaderLimit } from "@/lib/subscription/freeTierLimits";
import { coerceProfileIsPro } from "@/lib/subscription/coerceProfileIsPro";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/reader",
  "/analytics",
  "/profile",
  "/onboarding",
  "/session",
];

// Extra premium-only gates.
const PRO_ONLY_PREFIXES = [
  "/analytics",
];

const FREE_LIMIT_PREFIXES = [
  "/reader",
  "/session",
];

const DEMO_DAILY_LIMIT_COOKIE = "hidayah_demo_limit";

/**
 * `supabase.auth.getUser()` refreshes the session via `setAll`, which writes cookies on
 * `sessionResponse`. Returning a bare `NextResponse.redirect()` drops those Set-Cookie headers,
 * so the browser keeps expired tokens and the next navigation looks logged out.
 */
function redirectPreservingSupabaseSession(sessionResponse: NextResponse, url: URL): NextResponse {
  const redirect = NextResponse.redirect(url);
  const withGetSetCookie = sessionResponse.headers as Headers & { getSetCookie?: () => string[] };
  const serialized = typeof withGetSetCookie.getSetCookie === "function" ? withGetSetCookie.getSetCookie() : [];
  for (const cookie of serialized) {
    redirect.headers.append("Set-Cookie", cookie);
  }
  if (serialized.length === 0) {
    sessionResponse.cookies.getAll().forEach(({ name, value }) => {
      redirect.cookies.set(name, value);
    });
  }
  return redirect;
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/signup")) return true;
  if (pathname.startsWith("/pricing")) return true;
  if (pathname.startsWith("/forgot-password")) return true;
  if (pathname.startsWith("/update-password")) return true;
  if (pathname.startsWith("/auth/callback")) return true;
  if (pathname.startsWith("/api/stripe/webhook")) return true;
  return false;
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isProOnlyPath(pathname: string): boolean {
  return PRO_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isFreeLimitedPath(pathname: string): boolean {
  return FREE_LIMIT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPrefetchRequest(request: NextRequest): boolean {
  const purpose = request.headers.get("purpose")?.toLowerCase();
  if (purpose === "prefetch") return true;
  if (request.headers.has("next-router-prefetch")) return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { url, publicKey: key } = resolveSupabasePublicEnv();

  if (!url || !key) {
    return supabaseResponse;
  }
  if (isLikelySupabaseProjectMismatch(url, key)) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const demo = request.cookies.get(DEMO_COOKIE_NAME)?.value === "1";
  const freeDailyLimit = getFreeDailyReaderLimit();
  const prefetch = isPrefetchRequest(request);

  // Pro-only route gate: `profiles.is_pro` (updated by Stripe webhook).
  if (isProOnlyPath(pathname) && user && !demo) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .maybeSingle();
    const isPro = coerceProfileIsPro(prof?.is_pro);

    if (!isPro) {
      const pricing = new URL("/pricing", request.url);
      pricing.searchParams.set("next", pathname + request.nextUrl.search);
      return redirectPreservingSupabaseSession(supabaseResponse, pricing);
    }
  }

  if (isProtectedPath(pathname) && !user && !demo) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return redirectPreservingSupabaseSession(supabaseResponse, login);
  }

  // Demo limit gate: server-side cookie counter (httpOnly) for free demo sessions.
  // This avoids unlimited anonymous/demo usage from client-only state.
  if (isFreeLimitedPath(pathname) && demo && !user && request.method === "GET" && !prefetch) {
    const today = new Date().toISOString().slice(0, 10);
    const raw = request.cookies.get(DEMO_DAILY_LIMIT_COOKIE)?.value ?? "";
    const [datePart, countPart] = raw.split(":");
    const count = datePart === today ? Number.parseInt(countPart ?? "0", 10) || 0 : 0;

    if (count >= freeDailyLimit) {
      const pricing = new URL("/pricing", request.url);
      pricing.searchParams.set("limit", "demo");
      pricing.searchParams.set("next", pathname + request.nextUrl.search);
      return redirectPreservingSupabaseSession(supabaseResponse, pricing);
    }

    supabaseResponse.cookies.set(DEMO_DAILY_LIMIT_COOKIE, `${today}:${count + 1}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }

  // Free authenticated users: enforce daily usage on server-backed DB rows.
  // This ties usage limits to authenticated user IDs and cannot be bypassed
  // by changing client-only local state.
  if (isFreeLimitedPath(pathname) && user && !demo && request.method === "GET" && !prefetch) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .maybeSingle();
    const isPro = coerceProfileIsPro(prof?.is_pro);

    if (!isPro) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: usageRow } = await supabase
        .from("free_usage_daily")
        .select("reader_visits")
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .maybeSingle();

      const current = Number(usageRow?.reader_visits ?? 0) || 0;
      if (current >= freeDailyLimit) {
        const pricing = new URL("/pricing", request.url);
        pricing.searchParams.set("limit", "free");
        pricing.searchParams.set("next", pathname + request.nextUrl.search);
        return redirectPreservingSupabaseSession(supabaseResponse, pricing);
      }
      // Free-tier usage is incremented via POST /api/usage/free-daily-increment (reader + session SPA navigation).
    }
  }

  if ((pathname === "/login" || pathname === "/signup") && user) {
    return redirectPreservingSupabaseSession(supabaseResponse, new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}
