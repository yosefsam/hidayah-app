import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const reader = readFileSync(new URL("../src/app/(app)/reader/page.tsx", import.meta.url), "utf8");
const audio = readFileSync(new URL("../src/hooks/useQuranAudioPlayer.ts", import.meta.url), "utf8");

test("hidden reader chrome disables backdrop-filter and uses visibility for Safari hit-testing", () => {
  assert.match(css, /reader-chrome\[data-visible="false"\]/);
  assert.match(css, /visibility:\s*hidden/);
  assert.match(css, /backdrop-filter:\s*none\s*!important/);
  assert.match(css, /-webkit-backdrop-filter:\s*none\s*!important/);
  assert.match(css, /pointer-events:\s*none\s*!important/);
  assert.match(css, /translate3d\(0,\s*110%,\s*0\)/);
});

test("interactive elements use touch-action manipulation to avoid iOS tap delay", () => {
  assert.match(css, /touch-action:\s*manipulation/);
});

test("reader applies inert to hidden chrome and stops pointer propagation", () => {
  assert.match(reader, /inert:\s*true/);
  assert.match(reader, /data-reader-chrome/);
  assert.match(reader, /stopPropagation/);
  assert.match(reader, /appendStreamPage/);
  assert.doesNotMatch(reader, /goToPage\(next,\s*1\)/);
});

test("audio timeupdate is rAF-throttled to avoid Safari main-thread storms", () => {
  assert.match(audio, /requestAnimationFrame/);
  assert.match(audio, /timeupdate/);
  assert.match(audio, /pendingTimeRef/);
});
