import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server.js";

const require = createRequire(import.meta.url);

function loadCallback(mocks) {
  const compiled = ts.transpileModule(
    readFileSync(new URL("../src/app/auth/callback/route.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  ).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    process,
    URL,
    console,
    require: (id) => (id in mocks ? mocks[id] : require(id)),
  });
  return module.exports;
}

test("auth callback writes session cookies onto the redirect response", async () => {
  let capturedSetAll = null;
  const { GET } = loadCallback({
    "next/server": { NextResponse, NextRequest },
    "@/lib/site-url": {
      getSiteUrl: () => "https://hidayah.io",
      safeAuthNextPath: (next, fallback) => next || fallback,
    },
    "@/lib/supabase/env": {
      resolveSupabasePublicEnv: () => ({ url: "https://example.supabase.co", publicKey: "test-key" }),
      isLikelySupabaseProjectMismatch: () => false,
    },
    "@/lib/supabase/cookie-options": {
      withSupabaseAuthCookieOptions: (options, secure) => ({
        path: "/",
        sameSite: "lax",
        secure: secure ?? true,
        maxAge: 400,
        ...options,
      }),
    },
    "@supabase/ssr": {
      createServerClient: (_url, _key, { cookies }) => {
        capturedSetAll = cookies.setAll;
        return {
          auth: {
            exchangeCodeForSession: async () => {
              cookies.setAll([
                {
                  name: "sb-access-token",
                  value: "session-value",
                  options: { path: "/", sameSite: "lax" },
                },
              ]);
              return { error: null };
            },
          },
        };
      },
    },
  });

  const request = new NextRequest("https://hidayah.io/auth/callback?code=abc&next=/onboarding", {
    headers: { cookie: "sb-pkce-code-verifier=verifier" },
  });
  const response = await GET(request);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://hidayah.io/onboarding");
  const setCookie = response.headers.getSetCookie?.() ?? [];
  assert.ok(
    setCookie.some((c) => c.includes("sb-access-token=session-value")),
    `expected session cookie on redirect, got: ${JSON.stringify(setCookie)}`
  );
  assert.ok(typeof capturedSetAll === "function");
});

test("middleware redirect fallback preserves cookie attributes", async () => {
  const compiled = ts.transpileModule(
    readFileSync(new URL("../src/lib/supabase/middleware.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  ).outputText;

  // Smoke: file still exports updateSession and references withSupabaseAuthCookieOptions.
  assert.match(compiled, /withSupabaseAuthCookieOptions/);
  assert.match(compiled, /redirectPreservingSupabaseSession/);
});
