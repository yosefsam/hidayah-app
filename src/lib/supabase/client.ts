import { createBrowserClient } from "@supabase/ssr";
import { isLikelySupabaseProjectMismatch, resolveSupabasePublicEnv } from "@/lib/supabase/env";
import { supabaseAuthCookieOptions } from "@/lib/supabase/cookie-options";

/**
 * Thrown when NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are missing.
 * Next.js inlines `NEXT_PUBLIC_*` at build time — restart dev server after changing `.env.local`.
 */
export class SupabaseEnvError extends Error {
  constructor() {
    super(
      "Missing NEXT_PUBLIC_SUPABASE_URL and a public Supabase key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY), then restart the dev server."
    );
    this.name = "SupabaseEnvError";
  }
}

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

/**
 * Browser Supabase client (singleton). Always returns a valid client or throws — never null.
 * Uses first-party cookie storage (PKCE) with explicit SameSite=Lax + Secure on HTTPS so
 * Safari persists the session after sign-in / soft navigations.
 */
export function createClient(): ReturnType<typeof createBrowserClient> {
  const { url, publicKey: key } = resolveSupabasePublicEnv();

  if (process.env.NODE_ENV === "development") {
    console.log("[Supabase client]", {
      hasUrl: Boolean(url),
      urlPreview: url ? `${url.slice(0, 40)}${url.length > 40 ? "…" : ""}` : "(empty)",
      hasAnonKey: Boolean(key),
      anonKeyLength: key?.length ?? 0,
    });
  }

  if (!url || !key) {
    throw new SupabaseEnvError();
  }
  if (isLikelySupabaseProjectMismatch(url, key)) {
    throw new Error(
      "Supabase URL and public key appear to belong to different projects. Verify NEXT_PUBLIC_SUPABASE_URL with NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)."
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url, key, {
      cookieOptions: supabaseAuthCookieOptions(),
    });
  }
  return browserClient;
}
