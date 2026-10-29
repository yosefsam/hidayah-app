/**
 * Canonical site URL for server-side redirects (auth callback and metadata).
 * Set NEXT_PUBLIC_SITE_URL=https://hidayah.io in production.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

/**
 * Base URL embedded in Supabase email links (`emailRedirectTo` / `redirectTo`).
 * Prefer NEXT_PUBLIC_SITE_URL so confirmation & password-reset emails always use
 * production (e.g. https://hidayah.io), not a preview or www mismatch.
 */
export function getAuthSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (typeof window !== "undefined") return window.location.origin;
  return getSiteUrl();
}

/** @deprecated Prefer getAuthSiteUrl() for Supabase auth email redirects. */
export function getBrowserOrigin(): string {
  return getAuthSiteUrl();
}

/** Prevent open redirects from `next` query params after auth. */
export function safeAuthNextPath(next: string | null, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("://") || next.includes("\\")) return fallback;
  return next;
}
