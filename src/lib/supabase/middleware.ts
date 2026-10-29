import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE_NAME } from "@/lib/demo-cookie";
import { isLikelySupabaseProjectMismatch, resolveSupabasePublicEnv } from "@/lib/supabase/env";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/reader",
  "/analytics",
  "/profile",
  "/onboarding",
  "/session",
];

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

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
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

  // App Router API routes: only refresh auth cookies here. Page gates use pathname prefixes
  // that must NOT match `/api/*` — an explicit passthrough avoids extra profile queries and
  // guarantees handlers like `/api/reading-state` always run after session refresh.
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  const demo = request.cookies.get(DEMO_COOKIE_NAME)?.value === "1";
  if (isProtectedPath(pathname) && !user && !demo) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return redirectPreservingSupabaseSession(supabaseResponse, login);
  }

  if ((pathname === "/login" || pathname === "/signup") && user) {
    return redirectPreservingSupabaseSession(supabaseResponse, new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}
