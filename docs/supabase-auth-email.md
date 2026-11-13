# Supabase Auth + custom SMTP (hidayah.io)

This app uses **Supabase Auth** only—no custom email sending in Next.js. Configure **SMTP in the Supabase Dashboard** so confirmation, magic link, and password-reset emails are delivered from your domain.

## App-side URLs (what the code sends to Supabase)

| Flow | Parameter | Full redirect target (production) |
|------|-----------|-------------------------------------|
| **Signup confirmation** | `emailRedirectTo` | `https://hidayah.io/auth/callback?next=/onboarding` |
| **Forgot password** | `redirectTo` | `https://hidayah.io/auth/callback?next=/reset-password` |
| **Auth callback** (server) | — | `GET /auth/callback` exchanges `code` for session, then redirects to `next` (sanitized). |

Requirements:

1. Set **`NEXT_PUBLIC_SITE_URL=https://hidayah.io`** in Vercel (and local `.env.local` if testing production URLs locally).
2. **`getAuthSiteUrl()`** uses that env for `emailRedirectTo` / `redirectTo` so email links always use the canonical domain.
3. **`getSiteUrl()`** (server) uses the same env when **`/auth/callback`** issues the final redirect after `exchangeCodeForSession`.

## Values to enter in Supabase Dashboard

### Authentication → URL configuration

| Field | Value |
|-------|--------|
| **Site URL** | `https://hidayah.io` |

**Redirect URLs** (add each line or use a wildcard if your project allows it):

```
https://hidayah.io/**
http://localhost:3000/**
```

Wildcard `https://hidayah.io/**` covers:

- `https://hidayah.io/auth/callback`
- `https://hidayah.io/auth/callback?next=/onboarding`
- `https://hidayah.io/auth/callback?next=/reset-password`
- `https://hidayah.io/auth/callback?next=/dashboard` (e.g. deep links)

If your Supabase project does not support `**`, add explicit URLs for each `next` value you use.

### Project Settings → Auth → SMTP Settings

Enable **Custom SMTP** and fill in your provider (Resend, Postmark, SES, etc.):

- **Host**, **Port**, **Username**, **Password** (or API key per provider docs)
- **Sender email** (e.g. `noreply@hidayah.io`)
- **Sender name** (e.g. `Hidayah`)

Supabase sends:

- Confirm signup  
- Reset password  
- Magic link (if enabled)  
- Email change (if used)

No SMTP credentials belong in this repo—only in **Supabase**.

### Authentication → Email templates (optional)

Default templates work if `{{ .ConfirmationURL }}` / `{{ .TokenHash }}` are preserved. Recommended checks:

1. **Confirm signup** — must include the confirmation link variable Supabase provides (do not hardcode `hidayah.io` in the template body; the URL is generated from **Site URL** + redirect).
2. **Reset password** — same; link must remain the variable Supabase inserts.

If you customize HTML, keep the official variable placeholders from [Supabase docs](https://supabase.com/docs/guides/auth/auth-email-templates).

## Environment variables (this repo)

See **`env.example`**. For auth **email links** to use production:

```bash
NEXT_PUBLIC_SITE_URL=https://hidayah.io
```

SMTP is **not** configured via Next.js env vars; it is configured in **Supabase**.

## Testing checklist

### Signup confirmation email

- [ ] SMTP enabled in Supabase; send a test from provider if needed.
- [ ] Sign up with a real inbox on **https://hidayah.io/signup** (production build + env).
- [ ] Receive email; link should go to **`https://hidayah.io/auth/callback?...`** then redirect to **`/onboarding`**.
- [ ] If email confirmation is required, complete confirmation before expecting a full session (Supabase project setting).

### Forgot password email

- [ ] From **/forgot-password**, submit email.
- [ ] Link should hit **`/auth/callback`** then redirect to **`/reset-password`**.
- [ ] Submit new password; should land on **`/dashboard`** after `updateUser`.

### Login redirect behavior

- [ ] Open **`/login?next=/pricing`**, sign in → should land on **`/pricing`** (path sanitized; no `//` or external URLs).
- [ ] Open **`/login`**, sign in → **`/dashboard`**.
