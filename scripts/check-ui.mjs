import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

// Supply a local Playwright installation without adding production dependencies.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:5178/";
const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8").catch(() => "");
const env = Object.fromEntries(envText.split("\n").flatMap((line) => {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
}));
const browser = await chromium.launch({ headless: true });
const results = [];
const errors = [];
try {
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: width <= 390 ? 844 : 1000 } });
    page.on("pageerror", (error) => errors.push({ width, message: error.message }));
    for (const [name, hash] of [["landing", ""], ["explore", "#explore"], ["my", "#my"], ["community", "#komunitas"], ["contribute", "#contribute"], ["atlas", "#atlas"], ["admin-denied", "#admin-dash"], ["admin-import-denied", "#admin-import"], ["city", "#kotabaru"]]) {
      if (name === "community") {
        await page.route("**/rest/v1/rpc/community_stories*", (route) => route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{
            destination_id: "fixture-no-sticker",
            place_name: "Warung Uji Tanpa Stiker",
            description: "Tempat ini menggunakan penanda kategori karena belum memiliki ilustrasi stiker.",
            category_id: "kuliner",
            address: "Jalan Uji 1",
            region_code: "14.71.01",
            region_name: "Senapelan",
            city_id: "osm:relation:16563796",
            city_name: "Pekanbaru",
            author_label: "Kontributor",
            profile_key: null,
            public_profile: false,
            submission_status: "published",
            publication_status: "published",
            reviewed_at: "2026-10-22T10:00:00.000Z",
            published_at: "2026-10-22T10:00:00.000Z",
            sticker_path: null,
            sticker_alt: null,
          }]),
        }));
      }
      await page.goto(base + hash, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
      const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, textLength: document.body.innerText.length, heading: document.querySelector("h1")?.textContent }));
      assert.equal(layout.overflow, false, `${width}/${name}: horizontal overflow`);
      assert.ok(layout.textLength > 80, `${width}/${name}: empty page`);
      if (name === "landing") {
        await page.getByRole("heading", { name: "Ayo Jelajah!", exact: true }).waitFor();
        const copyOrder = await page.locator(".t-landing__copy").evaluate((copy) => [...copy.children].map((element) => element.textContent?.trim()));
        assert.ok(copyOrder[0]?.startsWith("Ayo Jelajah!") && copyOrder[1] === "NUSANTARA", `${width}: NUSANTARA should appear beneath the landing heading`);
        if (width > 320) assert.ok(await page.getByText("PETA EKSPLORASI INDONESIA", { exact: true }).isVisible());
        const illustration = page.locator(".t-landing__map");
        await illustration.evaluate((image) => image.decode());
         const imageSource = await illustration.evaluate((image) => ({ src: image.getAttribute("src"), width: image.naturalWidth }));
         assert.ok(imageSource.src?.endsWith("/assets/map/nusantara-watercolor-v2.png"));
         assert.ok(imageSource.width > 0, `${width}: watercolor illustration did not load`);
         const mask = await illustration.evaluate((image) => getComputedStyle(image).maskImage);
         assert.match(mask, /radial-gradient/, `${width}: watercolor illustration needs a four-edge feather mask`);
         if (width === 1440) {
           assert.equal(await page.locator(".t-landing__boat").count(), 2, "landing should show two illustrated pinisi");
           assert.equal(await page.locator(".t-landing__boat-motion").count(), 2, "both pinisi should have a full sailing loop");
           const routes = await page.locator(".t-landing__boat-route").evaluateAll((paths) => paths.map((path) => path.getTotalLength()));
           assert.ok(routes.every((length) => length >= 1800), `pinisi routes should circle the archipelago, got ${routes.map(Math.round).join(", ")} units`);
           const durations = await page.locator(".t-landing__boat-animation").evaluateAll((motions) => motions.map((motion) => parseFloat(motion.getAttribute("dur") || "0")));
           assert.ok(durations.length === 2 && durations.every((duration) => duration <= 12), `full-map sailing should finish briskly, got ${durations.join(", ")}s`);
           assert.equal(await page.locator(".t-landing__waves").count(), 0, "landing has no added wave overlay");
           assert.deepEqual(await page.locator(".t-landing__boat-animation").evaluateAll((motions) => motions.map((motion) => motion.getAttribute("rotate"))), ["0", "0"], "both pinisi stay upright along their routes");
           const getBoatPositions = () => page.locator(".t-landing__boat-motion").evaluateAll((boats) => boats.map((boat) => {
             const bounds = boat.getBoundingClientRect();
             return { x: bounds.x, y: bounds.y };
           }));
           const positionsBefore = await getBoatPositions();
           await page.waitForFunction((before) => {
             const boats = [...document.querySelectorAll(".t-landing__boat-motion")];
             return boats.length === before.length && boats.every((boat, index) => {
               const bounds = boat.getBoundingClientRect();
               return Math.hypot(bounds.x - before[index].x, bounds.y - before[index].y) >= 24;
             });
           }, positionsBefore, { timeout: 5000 });
           await page.emulateMedia({ reducedMotion: "reduce" });
           assert.equal(await page.locator(".t-landing__boat-motion").first().evaluate((motion) => getComputedStyle(motion).display), "none");
           assert.notEqual(await page.locator(".t-landing__boat-static").first().evaluate((boat) => getComputedStyle(boat).display), "none");
           await page.emulateMedia({ reducedMotion: "no-preference" });
         }
         assert.equal(await page.locator(".t-landmark").count(), 0);
        await page.getByRole("button", { name: /Lewati intro/ }).click();
        await page.locator(".leaflet-container").waitFor();
        assert.ok(page.url().endsWith("#explore"), "skip intro opens the map");
        await page.goto(base);
        await page.locator(".t-landing__map").evaluate((image) => image.decode());
        await page.getByRole("button", { name: "Ayo Jelajah!", exact: true }).click();
        await page.locator(".leaflet-container").waitFor();
        assert.ok(page.url().endsWith("#explore"));
        await page.goto(base);
        await page.locator(".t-landing__map").evaluate((image) => image.decode());
        await page.getByRole("button", { name: /Ketuk peta untuk menjelajahi Indonesia/ }).click();
        await page.locator(".leaflet-container").waitFor();
        assert.ok(page.url().endsWith("#explore"), "map prompt opens the map");
        await page.goto(base);
        await page.locator(".t-landing__map").evaluate((image) => image.decode());
      }
      if (name === "my") {
        await page.getByRole("button", { name: "Masuk", exact: true }).first().click();
        await page.locator("dialog[open]").waitFor();
        assert.equal(await page.locator("dialog input[type=email]").isDisabled(), false);
        if (width === 390) {
          await page.route("**/auth/v1/signup*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "00000000-0000-4000-8000-000000000011", email: "auth-flow@example.com", identities: [] }) }));
          await page.getByRole("button", { name: "Belum punya akun? Daftar", exact: true }).click();
          await page.getByPlaceholder("Nama kamu").fill("Pengguna uji");
          await page.getByPlaceholder("nama@email.com").fill("auth-flow@example.com");
          await page.locator("dialog input[type=password]").fill("registration-test-password");
          await page.getByRole("button", { name: "Daftar", exact: true }).click();
          await page.getByRole("status").filter({ hasText: /sudah punya akun/i }).waitFor();
          await page.route("**/auth/v1/recover*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
          await page.getByRole("button", { name: "Lupa kata sandi?", exact: true }).click();
          await page.getByRole("button", { name: "Kirim tautan pemulihan", exact: true }).click();
          await page.getByRole("status").filter({ hasText: /sandi baru.*TAPETA/i }).waitFor();
          await page.getByRole("button", { name: "Kembali ke masuk", exact: true }).click();
          await page.getByRole("heading", { name: "Masuk ke TAPETA", exact: true }).waitFor();
        }
        await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => !!document.activeElement.closest("dialog")), true);
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("dialog[open]").count(), 0);
      }
      if (name === "community") {
        assert.ok(await page.getByRole("heading", { name: "Cerita warga lokal", exact: true }).isVisible());
        await page.getByRole("button", { name: "Cerita warga", exact: true }).waitFor();
        await page.getByRole("button", { name: "Kontributor", exact: true }).waitFor();
        await page.locator(".t-community__story").first().waitFor();
        assert.equal(await page.locator(".t-community__story-art img").count(), 0, "no-sticker story does not pretend an asset exists");
        assert.equal(await page.locator(".t-community__story-art svg").count(), 1, "no-sticker story uses its category glyph");
        await page.locator("dialog[open]").waitFor();
        await page.getByRole("button", { name: "Tutup panduan" }).click();
        assert.equal(await page.locator("dialog[open]").count(), 0, "guide close button closes dialog");
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(300);
        assert.equal(await page.locator("dialog[open]").count(), 0, "dismissed guide stays dismissed after reload");
        await page.getByRole("button", { name: "Panduan", exact: true }).click();
        await page.locator("dialog[open]").waitFor();
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("dialog[open]").count(), 0, "guide reopens from Panduan and closes with Escape");
        await page.getByRole("button", { name: "Tambah kontribusi", exact: true }).click();
        await page.locator("dialog.t-auth[open]").waitFor();
        assert.equal(await page.locator("dialog.t-community-guide[open]").count(), 0, "dismissed once-only guide does not intercept the contribution action");
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("dialog.t-auth[open]").count(), 0, "authentication dialog closes after the contribution action");
        await page.getByRole("button", { name: "Cerita warga", exact: true }).click();
        await page.waitForFunction(() => Boolean(
          document.querySelector(".t-community__story") ||
          document.querySelector(".t-community__empty") ||
          document.querySelector(".t-community__state--error"),
        ));
        assert.ok(await page.locator(".t-community__story, .t-community__empty, .t-community__state--error").count() > 0);
        await page.getByRole("button", { name: "Kontributor", exact: true }).click();
        assert.ok(await page.getByRole("heading", { name: /Kontributor/ }).isVisible());
        await page.waitForFunction(() => Boolean(
          document.querySelector(".t-community__leader") ||
          document.querySelector(".t-community__empty") ||
          document.querySelector(".t-community__state--error"),
        ));
        assert.ok(await page.locator(".t-community__leader, .t-community__empty, .t-community__state--error").count() > 0);
      }
      if (name === "admin-denied") assert.ok(await page.getByText("AREA TERBATAS").isVisible());
      if (name === "explore") {
        let osmRequests = 0;
        await page.route("**/nominatim.openstreetmap.org/search?*", (route) => {
          osmRequests++;
          const url = new URL(route.request().url());
          assert.equal(url.searchParams.get("bounded"), "1");
          assert.equal(url.searchParams.get("countrycodes"), "id");
          if (url.searchParams.get("q") === "Tidak ketemu OSM") return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
          if (url.searchParams.get("q") === "Gagal OSM") return route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
          return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([
            { osm_type: "node", osm_id: 991, name: "Lokasi OSM uji", display_name: "Lokasi OSM uji, Pekanbaru, Riau", lat: "0.53", lon: "101.44" },
            { osm_type: "node", osm_id: 992, name: "Di luar kota", display_name: "Di luar kota", lat: "-6.2", lon: "106.8" },
          ]) });
        });
        const search = page.locator('input[type="search"]').first();
        await search.fill("Lokasi OSM uji");
        assert.equal(osmRequests, 0, "Typing must not trigger public Nominatim autocomplete");
        await page.getByRole("button", { name: "Cari lokasi OSM", exact: true }).click();
        await page.getByRole("button", { name: "Lokasi OSM uji", exact: true }).click();
        await page.getByRole("button", { name: "Cari lokasi OSM", exact: true }).click();
        assert.equal(osmRequests, 1, "Repeated searches should use the cache");
        await page.locator(".leaflet-popup-content").filter({ hasText: "Lokasi OSM uji" }).waitFor();
        assert.equal(await page.getByText("Di luar kota", { exact: true }).count(), 0);
        assert.ok(await page.getByText("Lokasi OSM, belum diverifikasi TAPETA", { exact: true }).isVisible());
        await page.getByRole("button", { name: "Usulkan tempat ini", exact: true }).click();
        assert.equal(await page.getByRole("spinbutton", { name: "Lintang", exact: true }).inputValue(), "0.53");
        await page.getByRole("button", { name: /Lanjut ke detail/ }).click();
        assert.equal(await page.getByPlaceholder("Coffe Toffe Pekanbaru").inputValue(), "Lokasi OSM uji");
        assert.match(await page.getByPlaceholder("Instagram resmi").inputValue(), /openstreetmap.org\/node\/991/);
        await page.goto(base + "#explore", { waitUntil: "domcontentloaded" });
        await page.locator('input[type="search"]').first().fill("Tidak ketemu OSM");
        await page.getByRole("button", { name: "Cari lokasi OSM", exact: true }).click();
        await page.getByText(/Tidak ada lokasi OSM yang cocok/).waitFor();
        await page.locator('input[type="search"]').first().fill("Gagal OSM");
        await page.getByRole("button", { name: "Cari lokasi OSM", exact: true }).click();
        await page.getByRole("alert").filter({ hasText: /Layanan pencarian OSM gagal/ }).waitFor();
        await page.locator('input[type="search"]').first().fill("");
        const overlay = page.locator(".pekanbaru-watercolor-overlay");
        await page.waitForFunction(() => {
          const image = document.querySelector(".pekanbaru-watercolor-overlay");
          return Boolean(image?.src.startsWith("data:image/png"));
        });
        const dimensions = await overlay.evaluate((image) => ({
          width: image.naturalWidth,
          height: image.naturalHeight,
        }));
        assert.deepEqual(
          dimensions,
          { width: 1494, height: 1053 },
          "The clipped watercolor must retain the source canvas dimensions to preserve its map alignment",
        );
      }
      if (name === "contribute") {
        const next = page.getByRole("button", { name: /Lanjut ke detail/ });
        assert.ok(await page.locator(".t-contrib__hint").isVisible(), "Map selection instructions should be visible without requiring geolocation");
        assert.match(await page.locator(".t-contrib__hint").innerText(), /Pilih titik di peta, tidak harus berada di sana/);
        assert.equal(await next.isDisabled(), true);
        const map = page.locator(".leaflet-container");
        if (width === 320) {
          await page.getByRole("spinbutton", { name: "Lintang", exact: true }).fill("0.53");
          await page.getByRole("spinbutton", { name: "Bujur", exact: true }).fill("101.44");
        } else {
          await map.click({ position: width === 390 ? { x: 160, y: 180 } : { x: 470, y: 500 } });
        }
        results.push({ width, name: "pick-contribution-point", nextEnabled: await next.isEnabled() });
        assert.equal(await next.isEnabled(), true, "Map click did not select coordinates");
        await page.getByRole("spinbutton", { name: "Lintang", exact: true }).fill("0");
        await page.getByRole("spinbutton", { name: "Bujur", exact: true }).fill("0");
        assert.equal(await next.isDisabled(), true, "Coordinates outside the selected city must not continue");
        assert.match(await page.locator(".t-contrib__detected").innerText(), /di luar batas Pekanbaru/i);
        await page.getByRole("spinbutton", { name: "Lintang", exact: true }).fill("91");
        assert.equal(await next.isDisabled(), true, "Invalid latitude accepted");
        await page.getByRole("spinbutton", { name: "Lintang", exact: true }).fill("0.53");
        await page.getByRole("spinbutton", { name: "Bujur", exact: true }).fill("101.44");
        assert.equal(await next.isEnabled(), true, "Keyboard coordinates not accepted");
        await next.click();
        const missingFields = page.locator(".t-contrib__validation");
        assert.ok(await missingFields.isVisible(), "A disabled submission button must explain what is missing");
        assert.match(await missingFields.innerText(), /nama.*2 karakter/i);
        assert.match(await missingFields.innerText(), /alamat.*4 karakter/i);
        assert.match(await missingFields.innerText(), /sumber.*4 karakter/i);
        assert.match(await missingFields.innerText(), /centang.*pernyataan/i);
        await page.getByPlaceholder("Coffe Toffe Pekanbaru").fill("Kafe Uji");
        await page.getByPlaceholder("Jl. Sisingamangaraja, Kec. Lima Puluh").fill("Jalan Uji 1");
        await page.getByPlaceholder("Instagram resmi").fill("Instagram resmi kafe");
        await page.getByRole("checkbox").check();
        assert.equal(await missingFields.count(), 0, "Missing-field guidance clears when the draft is complete");
        const submit = page.getByRole("button", { name: /Kirim usulan ke antrean moderasi|Masuk untuk mengirim usulan/ });
        assert.equal(await submit.isEnabled(), true, "A complete draft should let a signed-out user start the sign-in flow");
        await submit.click();
        await page.locator("dialog.t-auth[open]").waitFor();
        assert.equal(await page.getByPlaceholder("Coffe Toffe Pekanbaru").inputValue(), "Kafe Uji", "Draft must remain intact while the user signs in");
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("dialog.t-auth[open]").count(), 0, "Escape closes the authentication dialog");
        assert.equal(await page.locator(".t-contrib__form").count(), 1, "Closing sign-in must not dismiss the contribution flow");
        assert.equal(await page.getByPlaceholder("Coffe Toffe Pekanbaru").inputValue(), "Kafe Uji", "Closing sign-in must preserve the draft");
        await page.getByRole("button", { name: /Kembali ke lokasi/ }).click();
        await page.context().grantPermissions(["geolocation"], { origin: new URL(base).origin });
        await page.context().setGeolocation({ latitude: 0.53, longitude: 101.44, accuracy: 5000 });
        await page.getByRole("button", { name: "Gunakan lokasi saya", exact: true }).click();
        await page.waitForFunction(() => document.querySelector(".t-contrib__detected")?.textContent?.includes("Akurasi GPS perlu dikonfirmasi"));
        assert.equal(await next.isDisabled(), true, "Low-accuracy GPS must require a map confirmation");
        assert.match(await page.locator(".t-contrib__note").innerText(), /Akurasi GPS.*5\.000 m.*peta/i);
        if (width === 320) {
          await page.getByRole("spinbutton", { name: "Lintang", exact: true }).fill("0.531");
          await page.getByRole("spinbutton", { name: "Bujur", exact: true }).fill("101.441");
        } else {
          await map.click({ position: width === 390 ? { x: 160, y: 180 } : { x: 470, y: 500 } });
        }
        assert.equal(await next.isEnabled(), true, "Manual location confirmation should clear the GPS warning");
        await page.getByRole("button", { name: "Gunakan lokasi saya", exact: true }).click();
        await page.waitForFunction(() => document.querySelector(".t-contrib__detected")?.textContent?.includes("Akurasi GPS perlu dikonfirmasi"));
        await page.getByRole("spinbutton", { name: "Lintang", exact: true }).fill("0.531");
        assert.equal(await next.isDisabled(), true, "Editing only latitude must not confirm a low-accuracy GPS point");
        await page.getByRole("spinbutton", { name: "Bujur", exact: true }).fill("101.441");
        assert.equal(await next.isEnabled(), true, "Editing both coordinates should confirm the location manually");
        await page.context().setGeolocation({ latitude: 0.53, longitude: 101.44, accuracy: 35 });
        await page.getByRole("button", { name: "Gunakan lokasi saya", exact: true }).click();
        await page.waitForFunction(() => document.querySelector(".t-contrib__note")?.textContent?.includes("Akurasi GPS ±35 m"));
        assert.equal(await next.isEnabled(), true, "Accurate GPS remains usable");
      }
      await page.screenshot({ path: `.qa/tapeta-20261022-${width}-${name}.png`, fullPage: true });
      results.push({ width, name, ...layout });
    }
    await page.close();
  }
  if (env.SUPABASE_IMPORT_EMAIL && env.SUPABASE_IMPORT_PASSWORD) {
    const adminPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    adminPage.on("pageerror", (error) => errors.push({ width: 1440, name: "admin-workflow", message: error.message }));
    let submissionRows = [];
    let moderationPayload = null;
    let importStatus = "draft";
    await adminPage.route("**/rest/v1/rpc/admin_summary*", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ pending: 0, needs_revision: 0, published_submissions: 0, published_destinations: 0, active_contributors_30d: 0, new_contributors_30d: 0 }),
    }));
    await adminPage.route("**/rest/v1/rpc/list_admin_submissions*", (route) => {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(submissionRows) });
    });
    await adminPage.route("**/rest/v1/rpc/moderate_submission*", async (route) => {
      moderationPayload = route.request().postDataJSON();
      submissionRows = [{
        id: "00000000-0000-4000-8000-000000000097",
        name: "Kafe QA Berikutnya",
        category_id: "kafe",
        address: "Jalan Uji 2",
        hours: null,
        description: "Usulan berikutnya",
        status: "pending",
        moderator_note: null,
        region_code: "14.71.05",
        created_at: "2026-10-22T11:00:00.000Z",
        lat: 0.53,
        lon: 101.44,
        display_name: "Kontributor QA",
        source_url: null,
        source_label: "Sumber uji",
      }];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: moderationPayload.p_submission_id, status: moderationPayload.p_action }) });
    });
    await adminPage.route("**/rest/v1/rpc/admin_destinations*", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        id: "00000000-0000-4000-8000-000000000098",
        name: "Kafe QA Import",
        category_id: "kafe",
        address: "Alamat uji",
        hours: null,
        description: null,
        lat: 0.53,
        lon: 101.44,
        region_code: "14.71.05",
        sticker_slug: "qa-import",
        sticker_path: null,
        sticker_published: false,
        publication_status: importStatus,
        coordinate_source: "nominatim-search",
        coordinate_confidence: "approximate",
        source_url: "https://example.invalid",
        source_label: "Sumber uji",
      }]),
    }));
    await adminPage.route("**/rest/v1/rpc/admin_verify_destination*", async (route) => {
      const payload = route.request().postDataJSON();
      importStatus = payload.p_action === "verify" ? "verified" : payload.p_action === "publish" ? "published" : importStatus;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: payload.p_destination_id, status: importStatus, sticker_published: importStatus === "published" }) });
    });

    await adminPage.goto(base + "#explore", { waitUntil: "domcontentloaded" });
    await adminPage.getByRole("button", { name: "Masuk", exact: true }).click();
    await adminPage.locator("dialog.t-auth[open]").waitFor();
    await adminPage.getByPlaceholder("nama@email.com").fill(env.SUPABASE_IMPORT_EMAIL.trim());
    await adminPage.locator("dialog.t-auth input[type=password]").fill(env.SUPABASE_IMPORT_PASSWORD);
    await adminPage.locator("dialog.t-auth button[type=submit]").click();
    await adminPage.locator("dialog.t-auth[open]").waitFor({ state: "detached", timeout: 30000 });
    const loginNotice = adminPage.locator("dialog.t-notice[open]");
    if (await loginNotice.count()) await loginNotice.getByRole("button", { name: "Mengerti" }).click();

    await adminPage.goto(base + "#admin-dash", { waitUntil: "domcontentloaded" });
    await adminPage.getByRole("heading", { name: "Ringkasan moderasi", exact: true }).waitFor();
    await adminPage.getByRole("button", { name: /Lihat semua/ }).click();
    assert.ok(adminPage.url().endsWith("#admin"), "Admin dashboard Lihat semua should open the moderation queue");
    await adminPage.locator(".t-queueempty").waitFor();

    submissionRows = [{
      id: "00000000-0000-4000-8000-000000000099",
      name: "Kafe QA Moderasi",
      category_id: "kafe",
      address: "Jalan Uji 1",
      hours: null,
      description: "Fixture alur moderasi",
      status: "pending",
      moderator_note: null,
      region_code: "14.71.05",
      created_at: "2026-10-22T10:00:00.000Z",
      lat: 0.53,
      lon: 101.44,
      display_name: "Kontributor QA",
      source_url: null,
      source_label: "Sumber uji",
    }];
    await adminPage.getByRole("button", { name: "Muat ulang antrean", exact: true }).click();
    await adminPage.getByRole("button", { name: /Kafe QA Moderasi/ }).waitFor();
    let reasonAlert = "";
    adminPage.once("dialog", async (dialog) => { reasonAlert = dialog.message(); await dialog.accept(); });
    await adminPage.getByRole("button", { name: "Minta perbaikan", exact: true }).click();
    assert.match(reasonAlert, /alasan.*4 karakter/i);
    assert.equal(moderationPayload, null, "A missing review note must not call the moderation RPC");
    await adminPage.locator(".t-review__notefield textarea").fill("Sumber belum dapat diverifikasi");
    adminPage.once("dialog", (dialog) => dialog.accept());
    await adminPage.getByRole("button", { name: "Minta perbaikan", exact: true }).click();
    await adminPage.getByRole("button", { name: /Kafe QA Berikutnya/ }).waitFor();
    await adminPage.locator(".t-review__name").waitFor();
    assert.equal(moderationPayload?.p_action, "needs_revision");
    assert.equal(moderationPayload?.p_note, "Sumber belum dapat diverifikasi");
    const nextReview = (await adminPage.locator(".t-review__name").innerText()).trim();
    assert.equal(nextReview, "Kafe QA Berikutnya", "Refresh after a moderation decision should select another available review");

    await adminPage.goto(base + "#admin-import", { waitUntil: "domcontentloaded" });
    const importRow = adminPage.locator(".t-importrow").first();
    await importRow.waitFor();
    assert.equal(await importRow.getByRole("button", { name: "Publikasikan", exact: true }).count(), 0, "Approximate draft cannot be published before verification");
    await importRow.getByRole("button", { name: "Verifikasi", exact: true }).click();
    await adminPage.locator(".t-importrow__badge--verified").waitFor();
    assert.equal(await importRow.getByRole("button", { name: "Publikasikan", exact: true }).count(), 1, "Publishing is offered after verification");
    const desktopOverflow = await adminPage.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    await adminPage.setViewportSize({ width: 320, height: 844 });
    await adminPage.goto(base + "#admin", { waitUntil: "domcontentloaded" });
    await adminPage.locator(".t-queue__row").waitFor();
    const mobileOverflow = await adminPage.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(desktopOverflow, false, "Admin import overflows desktop viewport");
    assert.equal(mobileOverflow, false, "Admin queue overflows 320px viewport");
    results.push({ width: 1440, name: "admin-workflow", moderationNoteRequired: true, verifiedBeforePublish: true, mobileOverflow });
    await adminPage.close();
  }
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(JSON.stringify({ results, pageErrors: errors }, null, 2));
  await writeFile(".qa/tapeta-20261022-results.json", JSON.stringify({ results, pageErrors: errors }, null, 2));
} finally { await browser.close(); }
