import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isLikelySupabaseProjectMismatch, resolveSupabasePublicEnv } from "@/lib/supabase/env";
import { withSupabaseAuthCookieOptions } from "@/lib/supabase/cookie-options";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publicKey: key } = resolveSupabasePublicEnv();
  if (!url || !key) return null as unknown as ReturnType<typeof createServerClient>;
  if (isLikelySupabaseProjectMismatch(url, key)) return null as unknown as ReturnType<typeof createServerClient>;
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, withSupabaseAuthCookieOptions(options as never))
          );
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Route handlers that need Set-Cookie on a redirect must use a
          // response-bound client (see /auth/callback).
        }
      },
    },
  });
}
