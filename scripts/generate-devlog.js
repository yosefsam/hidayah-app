/**
 * Generates Hidayah_DevLog.docx from repository-grounded narrative + git history.
 * Run from project root: node scripts/generate-devlog.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ShadingType,
} = require("docx");

const ROOT = path.resolve(__dirname, "..");
const OUT_FILE = path.join(ROOT, "Hidayah_DevLog.docx");

function runGitLog() {
  try {
    return execSync("git log --oneline -120", {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    }).trim();
  } catch {
    return "(Git history unavailable — run from a git checkout.)";
  }
}

function todayStr() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function pBlank() {
  return new Paragraph({ spacing: { after: 120 } });
}

function pBody(text) {
  return new Paragraph({
    spacing: { after: 160, line: 276 },
    children: [new TextRun({ text })],
  });
}

function pItalic(text) {
  return new Paragraph({
    spacing: { after: 160, line: 276 },
    children: [new TextRun({ text, italics: true, color: "555555" })],
  });
}

function pBullet(text) {
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    indent: { left: 360, hanging: 360 },
    children: [new TextRun({ text: `• ${text}` })],
  });
}

function pCode(text) {
  return new Paragraph({
    spacing: { after: 160, line: 276 },
    shading: { fill: "F4F4F4", type: ShadingType.CLEAR, color: "F4F4F4" },
    children: [new TextRun({ text, font: "Consolas", size: 20 })],
  });
}

function h(level, title) {
  const hl =
    level === 1
      ? HeadingLevel.HEADING_1
      : level === 2
        ? HeadingLevel.HEADING_2
        : HeadingLevel.HEADING_3;
  return new Paragraph({
    heading: hl,
    spacing: { before: 240, after: 160 },
    children: [new TextRun({ text: title, bold: true })],
  });
}

function titlePage() {
  const date = todayStr();
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "Hidayah.io Development Log",
          bold: true,
          size: 56,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Project Journey, Obstacles, Debugging Process, and Resolutions",
          size: 28,
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: date, size: 24 })],
    }),
    pItalic(
      "Reconstructed from git commit messages, current source files, and migrations. Chronology is approximate where not explicitly dated; uncertain items are labeled as inferred."
    ),
    new Paragraph({ pageBreakBefore: true }),
  ];
}

function tocSection() {
  return [
    h(1, "Table of Contents"),
    pBody("1. Project Overview"),
    pBody("2. Development Journey Timeline"),
    pBody("3. Stripe Webhook Integration Issues and Fixes"),
    pBody("4. RLS (Row Level Security) Problems and Solutions"),
    pBody("5. PostgREST / Schema Cache Problems"),
    pBody("6. Session and Auth Issues"),
    pBody("7. Missing Database Tables / Broken Queries"),
    pBody("8. Pro Status Not Reflecting in the UI"),
    pBody("9. Missing User Profiles on Signup"),
    pBody("10. Other Bug Fixes"),
    pBody("11. Environment Variables Reference"),
    pBody("12. Key Lessons Learned"),
    new Paragraph({ pageBreakBefore: true }),
  ];
}

function section1() {
  return [
    h(1, "1. Project Overview"),
    pBody(
      "Hidayah.io (this repository: package name “hidayah”) is a Quran reading and habit application. The stack visible in package.json and source layout includes:"
    ),
    pBullet("Next.js 15 (App Router) — see src/app/ with route groups (app), auth routes, and API routes under src/app/api/."),
    pBullet("Supabase — @supabase/ssr and @supabase/supabase-js; browser client (src/lib/supabase/client.ts), server client (src/lib/supabase/server.ts), and service-role admin client (src/lib/supabase/admin.ts)."),
    pBullet("Stripe — stripe SDK; checkout and portal API routes; webhook at src/app/api/stripe/webhook/route.ts."),
    pBullet("Deployment — inferred: Vercel is referenced in src/lib/site-url.ts (VERCEL_URL) and is a typical host for Next.js; not verified from this repo alone."),
    pBody(
      "Goal (from product copy and features in-tree): help users read the Quran consistently, track sessions and progress, gate some features behind Pro (Stripe), and sync reading state to the backend where configured."
    ),
  ];
}

function section2(gitLog) {
  return [
    h(1, "2. Development Journey Timeline"),
    pBody(
      "The following phases are reconstructed from git log order (newest commits listed first in the excerpt at the end of this document) and from the evolution of directories such as src/app/api/stripe/ and Supabase migrations."
    ),
    pBullet("Foundation: initial Quran habit app with in-app reader (early history)."),
    pBullet("Reader and UI iteration: commits reference Quran reader improvements, ayah rendering, navigation, hasanat tracking."),
    pBullet("Production launch prep: Next.js security patches, production-oriented configuration."),
    pBullet("Monetization: pricing page, Stripe checkout, webhook wiring, Pro status and paywalls."),
    pBullet("Hardening: PostgREST workarounds (direct Postgres / RPC migration artifacts), RLS-aware reads (admin client in middleware and reading-state), profile and subscription consistency."),
    pBullet("UX and auth polish: session persistence, navbar on pricing when logged in, profile display, reset progress, billing portal, forgot/reset password flow, removal of developer-only Stripe env hint on pricing."),
    pItalic(
      "Exact calendar dates per change are not stored in commits reviewed here; ordering follows git ancestry."
    ),
    h(2, "Recent commit subjects (ground truth excerpt)"),
    pCode(gitLog.slice(0, 12000)),
  ];
}

function section3() {
  return [
    h(1, "3. Stripe Webhook Integration Issues and Fixes"),
    pBody(
      "What broke: webhook handler had to update Supabase while Stripe and Supabase each have their own configuration and constraints."
    ),
    pBody(
      "Symptoms / causes visible in history: PostgREST errors when updating profiles (PGRST202/PGRST205) — addressed by moving the critical profile Pro update to direct SQL via node-pg (see comment in src/app/api/stripe/webhook/route.ts). Commit messages reference “bypass postgrest schema cache”, “direct postgres query replaces rpc”, and adding pg/postgres-pool."
    ),
    pBody(
      "User mapping: checkout.session.completed resolves the Supabase user via client_reference_id or metadata.user_id (userIdFromCheckoutSession in webhook route). If missing, the handler logs an error and cannot attach Pro to a user — documented in code comments."
    ),
    pBody(
      "Middleware: src/lib/supabase/middleware.ts explicitly passes through /api/* so API routes (including the Stripe webhook) run after session refresh without applying page-route gates — reducing accidental blocking of webhooks by pathname logic."
    ),
    pBody(
      "Secrets: webhook signature verification uses STRIPE_WEBHOOK_SECRET; invalid signature returns 400. Wrong URL or secret in the Stripe Dashboard would surface as delivery failures outside this codebase (inferred operational issue)."
    ),
    pBody(
      "Missing DATABASE_URL: checkout.session.completed uses getPostgresPool(); if DATABASE_URL is absent, the route returns 501 — grounded in webhook source."
    ),
    pBody(
      "Profile row missing: after UPDATE affects 0 rows, the handler inserts a profiles stub then retries (commit: fix: create profile row if missing in stripe webhook). supabase/migrations/20260406120000_ensure_handle_new_user_trigger.sql reasserts handle_new_user on auth.users."
    ),
  ];
}

function section4() {
  return [
    h(1, "4. RLS (Row Level Security) Problems and Solutions"),
    pBody(
      "Symptom: user-scoped Supabase clients could not see or update profiles.is_pro consistently compared to dashboard truth in Supabase."
    ),
    pBody(
      "Middleware: fetchProfileIsProRow uses createAdminClient() when available so profiles.is_pro is read with service role, avoiding RLS hiding the column (comment in src/lib/supabase/middleware.ts)."
    ),
    pBody(
      "GET /api/reading-state: subscription Pro status is loaded via getUserSubscriptionStatus(user.id) which uses the admin/service client (see src/lib/subscription/getUserSubscriptionStatus.ts and reading-state route) — introduced after debugging showed JWT-scoped reads returning false Pro."
    ),
    pBody(
      "Stripe portal: POST /api/stripe/portal loads stripe_customer_id via createAdminClient() after cookie auth — commit history references fixing billing portal lookup."
    ),
  ];
}

function section5() {
  return [
    h(1, "5. PostgREST / Schema Cache Problems"),
    pBody(
      "The webhook route documents PGRST202/PGRST205 as motivation for bypassing PostgREST on the profiles Pro update, using the pg driver with DATABASE_URL instead."
    ),
    pBody(
      "supabase/migrations/20260331120000_stripe_webhook_profile_rpc.sql defines stripe_webhook_set_profile_pro as a security-definer RPC granted to service_role — an alternate server-side path when PostgREST table resolution was problematic; current webhook uses direct SQL per route comments."
    ),
  ];
}

function section6() {
  return [
    h(1, "6. Session and Auth Issues"),
    pBody(
      "Session persistence: commit “fix: persist supabase session across page navigations” indicates SSR/cookie handling was tightened so users stayed logged in across navigations."
    ),
    pBody(
      "Middleware: redirectPreservingSupabaseSession copies Set-Cookie from the Supabase session response onto redirects so tokens are not dropped (documented comment in middleware)."
    ),
    pBody(
      "Pricing page navbar: commit “fix: show authenticated navbar on pricing page for logged-in users” aligns logged-in UX on /pricing with the rest of the app."
    ),
  ];
}

function section7() {
  return [
    h(1, "7. Missing Database Tables / Broken Queries"),
    pBody(
      "user_reading_state: present in migrations (e.g. user_reading_state table) and used by GET/POST src/app/api/reading-state/route.ts."
    ),
    pBody(
      "subscriptions: src/lib/stripe/syncSubscriptionToSupabase.ts upserts into subscriptions; FK expects profiles to exist."
    ),
    pBody(
      "Invalid column display_name: client profile selects were updated to full_name where the schema did not expose display_name (commit: fix: add isPro logging and remove invalid display_name column) — symptoms included 400/errors from PostgREST when selecting a non-existent column."
    ),
  ];
}

function section8() {
  return [
    h(1, "8. Pro Status Not Reflecting in the UI"),
    pBody(
      "Observed mismatch (from commit messages and code): DB could show profiles.is_pro true while UI still showed Free; middleware could allow Pro routes while Zustand still had stale or unknown Pro state."
    ),
    pBody(
      "Data flow: GET /api/reading-state returns subscription including isPro; UserSessionProvider (src/components/providers/user-session-provider.tsx) maps subscription into Zustand proStatus; UI components read proStatus for badges and “Upgrade to Pro” visibility."
    ),
    pBody(
      "Fixes in history: reflect Pro in UI from reading-state; remove invalid profile column queries; sync Pro via API instead of browser RLS for some paths; ultimately reading-state subscription uses admin getUserSubscriptionStatus to align with DB; temporary debug logs were later removed."
    ),
  ];
}

function section9() {
  return [
    h(1, "9. Missing User Profiles on Signup"),
    pBody(
      "schema.sql and migration 20260406120000_ensure_handle_new_user_trigger.sql define handle_new_user on auth.users inserting into public.profiles (id, email)."
    ),
    pBody(
      "When the trigger did not run or rows were missing, checkout could not UPDATE profiles — mitigated by webhook fallback insert + retry and by ensuring the trigger exists in SQL migrations."
    ),
  ];
}

function section10() {
  return [
    h(1, "10. Other Bug Fixes"),
    h(2, "Reset reading progress"),
    pBody(
      "resetReadingProgress no longer reset proStatus to unknown; dialog POSTs cleared reading state to the server with loading/error handling (commit: reset progress loading…)."
    ),
    h(2, "Manage billing"),
    pBody(
      "Portal route uses admin client for stripe_customer_id and clearer errors when missing (same commit series)."
    ),
    h(2, "Forgot / reset password"),
    pBody(
      "Dark-themed forgot-password and reset-password pages; update-password redirects to /reset-password; reset email redirectTo updated to production URL with NEXT_PUBLIC_SITE_URL fallback (later commit)."
    ),
    h(2, "Dev warning text"),
    pBody(
      "Removed Stripe env configuration hint from pricing footer (commit: remove stripe config warning from pricing page)."
    ),
    h(2, "Navbar / account display"),
    pBody(
      "Commits reference displaying user name in navbar and name/email on profile."
    ),
  ];
}

function section11() {
  return [
    h(1, "11. Environment Variables Reference"),
    pBody("Names only — do not commit real secrets. Purposes inferred from source:"),
    pBullet("NEXT_PUBLIC_SUPABASE_URL — Supabase project URL."),
    pBullet("NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — browser Supabase key (see src/lib/supabase/env.ts)."),
    pBullet("SUPABASE_SERVICE_ROLE_KEY — server-only; admin client, webhooks."),
    pBullet("DATABASE_URL — direct Postgres connection string (webhook profile updates via pg)."),
    pBullet("STRIPE_SECRET_KEY — Stripe API for checkout/portal/server."),
    pBullet("STRIPE_WEBHOOK_SECRET — verifies Stripe webhook signatures."),
    pBullet("STRIPE_PRICE_PREMIUM — price id for checkout (checkout route)."),
    pBullet("NEXT_PUBLIC_SITE_URL — canonical site URL for redirects and emails (site-url.ts, layout, forgot-password)."),
    pBullet("VERCEL_URL — inferred host for server URL when NEXT_PUBLIC_SITE_URL unset (Vercel)."),
    pBullet("FREE_DAILY_READER_LIMIT — optional cap for free tier (freeTierLimits.ts)."),
  ];
}

function section12() {
  return [
    h(1, "12. Key Lessons Learned"),
    pBullet("RLS applies to user JWT clients; privileged reads/writes for billing and subscription truth often need the service role or direct SQL."),
    pBullet("PostgREST schema/cache errors (PGRST202/PGRST205) may require bypass paths: RPC, direct Postgres, or schema fixes."),
    pBullet("Webhooks must be reachable and correctly signed; middleware should not apply page gates to /api routes that need to run independently."),
    pBullet("UI state (Zustand) must be fed from the same source of truth as the server (reading-state) or it will diverge."),
    pBullet("Auth triggers for profiles are easy to break in deployment; add server-side fallbacks for critical money paths."),
    pBullet("Password reset links must use production NEXT_PUBLIC_SITE_URL in hosted environments."),
    h(2, "Most painful bugs (inferred from commit density)"),
    pBody(
      "Stripe webhook → Supabase profile updates blocked by PostgREST; Pro status wrong in UI despite DB; RLS hiding is_pro — multiple rounds of debugging reflected in sequential fixes."
    ),
  ];
}

async function main() {
  const gitLog = runGitLog();

  const children = [
    ...titlePage(),
    ...tocSection(),
    ...section1(),
    ...section2(gitLog),
    ...section3(),
    ...section4(),
    ...section5(),
    ...section6(),
    ...section7(),
    ...section8(),
    ...section9(),
    ...section10(),
    ...section11(),
    ...section12(),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT_FILE, buffer);
  console.log("Wrote", OUT_FILE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
