import { createServerClient } from "@supabase/ssr";
import { getSiteUrl, safeAuthNextPath } from "@/lib/site-url";
import { isLikelySupabaseProjectMismatch, resolveSupabasePublicEnv } from "@/lib/supabase/env";
import { withSupabaseAuthCookieOptions } from "@/lib/supabase/cookie-options";
import { NextRequest, NextResponse } from "next/server";

/**
 * PKCE email confirmation / password-reset callback.
 *
 * Critical for Safari: session cookies from `exchangeCodeForSession` must be written onto the
 * *redirect* response. Writing only via `cookies()` from next/headers and then returning a new
 * `NextResponse.redirect()` often drops Set-Cookie on Safari, so the user lands logged out.
 */
export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const next = safeAuthNextPath(requestUrl.searchParams.get("next"), "/dashboard");

  // Prefer the request origin so host-only cookies match the host the user actually hit
  // (apex vs www, preview vs prod). Fall back to configured site URL.
  const configured = getSiteUrl();
  const requestOrigin = requestUrl.origin;
  const allowedOrigins = new Set(
    [configured, requestOrigin, "https://hidayah.io", "https://www.hidayah.io"].filter(Boolean)
  );
  const base = allowedOrigins.has(requestOrigin) ? requestOrigin : configured;
  const secure = base.startsWith("https:");

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=auth`);
  }

  const { url, publicKey: key } = resolveSupabasePublicEnv();
  if (!url || !key || isLikelySupabaseProjectMismatch(url, key)) {
    return NextResponse.redirect(`${base}/login?error=auth`);
  }

  const redirect = NextResponse.redirect(`${base}${next}`);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirect.cookies.set(name, value, withSupabaseAuthCookieOptions(options as never, secure));
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(`${base}/login?error=auth`);
  }

  return redirect;
}
