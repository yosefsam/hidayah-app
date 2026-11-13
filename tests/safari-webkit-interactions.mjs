/**
 * Playwright WebKit (Safari engine) interaction smoke test.
 * Run with: node tests/safari-webkit-interactions.mjs
 * Requires a local server on BASE_URL (default http://127.0.0.1:3000).
 */
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";

async function withBrowser(browserType, name, fn) {
  const browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        name === "webkit"
          ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
          : undefined,
      isMobile: name === "webkit",
      hasTouch: name === "webkit",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await fn(page, errors);
    await context.close();
  } finally {
    await browser.close();
  }
}

async function enableDemo(page) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Try demo/i }).click();
  await page.waitForURL(/\/dashboard/);
}

async function run() {
  console.log("BASE", BASE);

  await withBrowser(webkit, "webkit", async (page, errors) => {
    await enableDemo(page);

    // Dashboard buttons should respond quickly.
    const t0 = Date.now();
    await page.getByRole("link", { name: /^Read$/i }).first().click();
    await page.waitForURL(/\/reader/);
    const navMs = Date.now() - t0;
    console.log("webkit dashboard→reader ms", navMs);
    assert.ok(navMs < 5000, `Reader navigation too slow on WebKit: ${navMs}ms`);

    // Immersive: bottom app nav must be hidden.
    const bottomNavVisible = await page.locator(".app-bottom-nav").isVisible().catch(() => false);
    assert.equal(bottomNavVisible, false, "Bottom nav should be hidden in immersive reader");

    // Wait for Quran text, then reveal chrome by tapping the reader main surface.
    await page.locator(".font-arabic").first().waitFor({ state: "visible", timeout: 15000 });
    const readerMain = page.locator("main.mx-auto").first();
    await readerMain.click({ position: { x: 24, y: 48 } });
    await page.waitForTimeout(350);

    // Toolbar home is an icon button with aria-label Home
    const homeBtn = page.locator('header.reader-toolbar a[aria-label="Home"]').first();
    await homeBtn.waitFor({ state: "visible", timeout: 4000 });

    // Measure chrome button responsiveness (the Safari regression).
    const t1 = Date.now();
    await homeBtn.click({ timeout: 3000 });
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    const homeMs = Date.now() - t1;
    console.log("webkit home button ms", homeMs);
    assert.ok(homeMs < 4000, `Home button unresponsive on WebKit: ${homeMs}ms`);

    // Fresh reader session for chrome hide/show (do not invoke Audio — headless WebKit can crash).
    await page.goto(`${BASE}/reader`, { waitUntil: "domcontentloaded" });
    await page.locator(".font-arabic").first().waitFor({ state: "visible", timeout: 15000 });

    const toolbar = page.locator("header.reader-toolbar");
    const player = page.locator(".reader-player");

    // Reveal chrome.
    if ((await toolbar.getAttribute("data-visible")) !== "true") {
      await page.locator("main.mx-auto").first().click({ position: { x: 24, y: 48 } });
      await page.waitForTimeout(250);
    }
    assert.equal(await toolbar.getAttribute("data-visible"), "true");

    // Bookmark / settings buttons must be immediately clickable when chrome is visible.
    const bookmark = page.locator('header.reader-toolbar button[aria-label*="bookmark" i]').first();
    await bookmark.waitFor({ state: "visible", timeout: 3000 });
    const t2 = Date.now();
    await bookmark.click({ timeout: 3000 });
    const bookmarkMs = Date.now() - t2;
    console.log("webkit bookmark button ms", bookmarkMs);
    assert.ok(bookmarkMs < 3000, `Bookmark button unresponsive on WebKit: ${bookmarkMs}ms`);

    // Hide chrome by tapping reading surface (ayah or empty). This used to no-op on Safari
    // because ayah nodes were role=button and were excluded from the toggle handler.
    await page.locator(".font-arabic").first().click({ position: { x: 40, y: 60 } });
    await page.waitForTimeout(300);
    assert.equal(await toolbar.getAttribute("data-visible"), "false");
    const styles = await toolbar.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        pe: cs.pointerEvents,
        vis: cs.visibility,
        bd: cs.backdropFilter || cs.webkitBackdropFilter || "none",
      };
    });
    console.log("webkit hidden chrome", styles);
    assert.equal(styles.pe, "none");
    assert.equal(styles.vis, "hidden");

    const playerStyles = await player.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { pe: cs.pointerEvents, vis: cs.visibility, transform: cs.transform };
    });
    console.log("webkit hidden player", playerStyles);
    assert.equal(playerStyles.pe, "none");
    assert.equal(playerStyles.vis, "hidden");

    // Landing CTAs should respond quickly too (site-wide touch-action fix).
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    const signup = page.getByRole("link", { name: /Get started/i }).first();
    const t3 = Date.now();
    await signup.click();
    await page.waitForURL(/\/signup/);
    console.log("webkit signup CTA ms", Date.now() - t3);

    const serious = errors.filter((e) => !/ResizeObserver|AbortError|NotAllowedError/i.test(e));
    assert.equal(serious.length, 0, `WebKit page errors: ${serious.join(" | ")}`);
    console.log("webkit OK");
  });

  // Chromium regression check is optional (system Chrome may already cover this).
  try {
    await withBrowser(chromium, "chromium", async (page, errors) => {
      await enableDemo(page);
      await page.getByRole("link", { name: /^Read$/i }).first().click();
      await page.waitForURL(/\/reader/);
      assert.equal(errors.length, 0, `Chromium page errors: ${errors.join(" | ")}`);
      console.log("chromium OK");
    });
  } catch (err) {
    if (String(err).includes("Executable doesn't exist")) {
      console.log("chromium skipped (Playwright Chromium not installed)");
    } else {
      throw err;
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
