import type { CookieOptions } from "@supabase/ssr";

/**
 * First-party auth cookie defaults that Safari accepts reliably on HTTPS.
 * Explicit path/sameSite/secure avoids host-only cookies that drop attributes
 * when copied onto redirect responses without options.
 */
export function supabaseAuthCookieOptions(secure?: boolean): CookieOptions {
  const isSecure =
    typeof secure === "boolean"
      ? secure
      : typeof window !== "undefined"
        ? window.location.protocol === "https:"
        : process.env.NODE_ENV === "production";

  return {
    path: "/",
    sameSite: "lax",
    secure: isSecure,
    // Match @supabase/ssr default longevity (~400 days).
    maxAge: 60 * 60 * 24 * 400,
  };
}

/** Merge caller options with production-safe defaults (caller wins on conflicts). */
export function withSupabaseAuthCookieOptions(
  options?: Partial<CookieOptions>,
  secure?: boolean
): CookieOptions {
  return {
    ...supabaseAuthCookieOptions(secure),
    ...options,
    path: options?.path ?? "/",
    sameSite: options?.sameSite ?? "lax",
    secure: options?.secure ?? supabaseAuthCookieOptions(secure).secure,
  };
}
