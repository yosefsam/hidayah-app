import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server.js";

const require = createRequire(import.meta.url);
function loadModule(path, mocks) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, process, URL,
    require: (id) => id in mocks ? mocks[id] : require(id),
  });
  return module.exports;
}

function middlewareFor(user) {
  return loadModule("../src/lib/supabase/middleware.ts", {
    "next/server": { NextResponse },
    "@/lib/demo-cookie": { DEMO_COOKIE_NAME: "hidayah_demo" },
    "@/lib/supabase/env": {
      resolveSupabasePublicEnv: () => ({ url: "https://example.supabase.co", publicKey: "test" }),
      isLikelySupabaseProjectMismatch: () => false,
    },
    "@supabase/ssr": {
      createServerClient: (_url, _key, { cookies }) => ({
        auth: { getUser: async () => {
          cookies.setAll([{ name: "refreshed-session", value: "test", options: { httpOnly: true, path: "/" } }]);
          return { data: { user } };
        } },
        from: () => { throw new Error("Access must not query paid status or usage tables"); },
      }),
    },
  }).updateSession;
}

test("ordinary accounts can read repeatedly and access analytics without a paid profile", async () => {
  const updateSession = middlewareFor({ id: "ordinary-user" });
  for (const path of ["/analytics", "/reader", "/session", "/reader?page=4", "/reader?page=5"]) {
    const response = await updateSession(new NextRequest(`https://hidayah.io${path}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.match(response.headers.get("set-cookie"), /refreshed-session/);
  }
});

test("an exhausted legacy demo cookie does not block free access", async () => {
  const updateSession = middlewareFor(null);
  const response = await updateSession(new NextRequest("https://hidayah.io/reader", {
    headers: { cookie: "hidayah_demo=1; hidayah_demo_limit=2099-01-01:999" },
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});

test("free access preserves login protection and refreshed cookies", async () => {
  const response = await middlewareFor(null)(new NextRequest("https://hidayah.io/analytics"));
  const redirect = new URL(response.headers.get("location"));
  assert.equal(redirect.pathname, "/login");
  assert.equal(redirect.searchParams.get("next"), "/analytics");
  assert.match(response.headers.get("set-cookie"), /refreshed-session/);
});

function readingStateFor(user) {
  return loadModule("../src/app/api/reading-state/route.ts", {
    "next/server": { NextResponse },
    "@/lib/supabase/server": { createClient: async () => ({
      auth: { getUser: async () => ({ data: { user } }) },
      from: (table) => {
        assert.equal(table, "user_reading_state");
        return { select: () => ({ eq: (_key, id) => {
          assert.equal(id, user.id);
          return { maybeSingle: async () => ({ data: { visited_pages: [1, 2, 3, 4] }, error: null }) };
        } }) };
      },
    }) },
  });
}

test("reading state loads without subscription or usage tables", async () => {
  const response = await readingStateFor({ id: "reader" }).GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { visited_pages: [1, 2, 3, 4] });
});

test("reading-state API still rejects unauthenticated reads and writes", async () => {
  const routes = readingStateFor(null);
  assert.equal((await routes.GET()).status, 401);
  assert.equal((await routes.POST(new Request("https://hidayah.io/api/reading-state", { method: "POST" }))).status, 401);
});
