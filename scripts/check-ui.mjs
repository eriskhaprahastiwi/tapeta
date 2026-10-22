import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

// Supply a local Playwright installation without adding production dependencies.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:5178/";
const browser = await chromium.launch({ headless: true });
const results = [];
const errors = [];
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 } });
    page.on("pageerror", (error) => errors.push({ width, message: error.message }));
    for (const [name, hash] of [["landing", ""], ["explore", "#explore"], ["my", "#my"], ["community", "#komunitas"], ["contribute", "#contribute"], ["atlas", "#atlas"], ["admin-denied", "#admin-dash"], ["city", "#kotabaru"]]) {
      await page.goto(base + hash, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
      const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, textLength: document.body.innerText.length, heading: document.querySelector("h1")?.textContent }));
      assert.equal(layout.overflow, false, `${width}/${name}: horizontal overflow`);
      assert.ok(layout.textLength > 80, `${width}/${name}: empty page`);
      if (name === "landing") {
        const illustration = page.locator(".t-landing__map");
        await illustration.evaluate((image) => image.decode());
         const imageSource = await illustration.evaluate((image) => ({ src: image.getAttribute("src"), width: image.naturalWidth }));
         assert.ok(imageSource.src?.endsWith("/assets/map/nusantara-watercolor-v2.png"));
         assert.ok(imageSource.width > 0, `${width}: watercolor illustration did not load`);
         const mask = await illustration.evaluate((image) => getComputedStyle(image).maskImage);
         assert.match(mask, /radial-gradient/, `${width}: watercolor illustration needs a four-edge feather mask`);
         assert.equal(await page.locator(".t-landmark").count(), 0);
        await page.getByRole("button", { name: "Ayo Jelajah!", exact: true }).click();
        await page.locator(".leaflet-container").waitFor();
        assert.ok(page.url().endsWith("#explore"));
        await page.goto(base);
        await page.locator(".t-landing__map").evaluate((image) => image.decode());
      }
      if (name === "my") {
        await page.getByRole("button", { name: "Masuk", exact: true }).first().click();
        await page.locator("dialog[open]").waitFor();
        assert.equal(await page.locator("dialog input[type=email]").isDisabled(), true);
        await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => !!document.activeElement.closest("dialog")), true);
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("dialog[open]").count(), 0);
      }
      if (name === "admin-denied") assert.ok(await page.getByText("AREA TERBATAS").isVisible());
      if (name === "contribute") {
        const next = page.getByRole("button", { name: /Lanjut ke detail/ });
        assert.equal(await next.isDisabled(), true);
        const map = page.locator(".leaflet-container");
        await map.click({ position: { x: 160, y: 180 } });
        results.push({ width, name: "pick-contribution-point", nextEnabled: await next.isEnabled() });
        assert.equal(await next.isEnabled(), true, "Map click did not select coordinates");
        await page.getByRole("spinbutton", { name: "Lintang", exact: true }).fill("91");
        assert.equal(await next.isDisabled(), true, "Invalid latitude accepted");
        await page.getByRole("spinbutton", { name: "Lintang", exact: true }).fill("0.53");
        await page.getByRole("spinbutton", { name: "Bujur", exact: true }).fill("101.44");
        assert.equal(await next.isEnabled(), true, "Keyboard coordinates not accepted");
      }
      await page.screenshot({ path: `.qa/tapeta-20261022-${width}-${name}.png`, fullPage: true });
      results.push({ width, name, ...layout });
    }
    await page.close();
  }
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(JSON.stringify({ results, pageErrors: errors }, null, 2));
  await writeFile(".qa/tapeta-20261022-results.json", JSON.stringify({ results, pageErrors: errors }, null, 2));
} finally { await browser.close(); }
