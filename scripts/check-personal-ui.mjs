import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const env = Object.fromEntries((await readFile(new URL("../.env.local", import.meta.url), "utf8")).split("\n").flatMap((line) => {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()); return m ? [[m[1], m[2].replace(/^['"]|['"]$/g, "")]] : [];
}));
const base = process.env.PREVIEW_URL || "http://127.0.0.1:5178/";
const browser = await chromium.launch();
try {
  for (const width of process.env.CHECK_WIDTH ? [Number(process.env.CHECK_WIDTH)] : [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    let place = null, story = null;
    const events = [];
    let failList = false;
    const addEvent = (kind, detail = null) => events.unshift({ id: crypto.randomUUID(), place_id: place.id, place_name: place.name, kind, detail, created_at: new Date().toISOString() });
    await page.route("**/rest/v1/rpc/*", async (route) => {
      const rpc = new URL(route.request().url()).pathname.split("/").at(-1);
      const body = route.request().postDataJSON() ?? {};
      let data;
      if (rpc === "list_personal_places") {
        if (failList) { failList = false; return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Gangguan simpanan uji" }) }); }
        data = place ? [place] : [];
      } else if (rpc === "save_personal_place") {
        assert.ok(body.p_osm?.id === "node:99990001" || body.p_destination_id);
        place = { id: "00000000-0000-4000-8000-000000000011", place_key: "osm:node:99990001", destination_id: null, osm_type: "node", osm_id: 99990001,
          name: "Tempat wishlist uji", address: "Alamat uji Pekanbaru", city_id: "osm:relation:16563796", city_name: "Pekanbaru", province: "Riau", relation_id: 16563796,
          lat: 0.53, lon: 101.44, source_url: "https://www.openstreetmap.org/node/99990001", saved: true, visited_on: null, publication_status: null };
        addEvent("saved"); data = place;
      } else if (rpc === "update_personal_place") {
        if (body.p_action === "visit") { place.visited_on = body.p_date; addEvent("visited", body.p_date); }
        if (body.p_action === "unvisit") { place.visited_on = null; addEvent("visit_cancelled"); }
        if (body.p_action === "unsave") { place.saved = false; addEvent("unsaved"); }
        data = place;
      } else if (rpc === "personal_timeline") data = events;
      else if (rpc === "submit_visit_story") {
        assert.equal(body.p_place_id, place.id);
        story = { ...place, id: "00000000-0000-4000-8000-000000000022", place_id: place.id, body: body.p_body, status: "pending", revision: 1, author_label: "Kontributor", moderator_note: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        place.story = story;
        addEvent("story_submitted"); data = story;
      } else if (rpc === "list_visit_stories") data = story && (body.p_scope !== "public" || story.status === "published") && (!body.p_status || body.p_status === story.status) ? [story] : [];
      else if (rpc === "moderate_visit_story") { story.status = body.p_action; addEvent(`story_${body.p_action}`); data = null; }
      else return route.continue();
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
    });
    await page.route("**/nominatim.openstreetmap.org/search?*", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify([{ osm_type: "node", osm_id: 99990001, name: "Tempat wishlist uji", display_name: "Alamat uji Pekanbaru", lat: "0.53", lon: "101.44" }]) }));
    await page.goto(base + "#explore");
    await page.locator('input[type="search"]').first().fill("Tempat wishlist uji");
    await page.waitForFunction(() => !document.querySelector(".t-osm-search__search")?.hasAttribute("disabled"));
    await page.getByRole("button", { name: "Cari lokasi OSM", exact: true }).click();
    await page.getByRole("button", { name: "Tempat wishlist uji", exact: true }).click();
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await page.locator("dialog.t-auth[open]").waitFor();
    await page.getByPlaceholder("nama@email.com").fill(env.SUPABASE_IMPORT_EMAIL.trim());
    await page.locator('dialog.t-auth input[type="password"]').fill(env.SUPABASE_IMPORT_PASSWORD);
    await page.locator('dialog.t-auth button[type="submit"]').click();
    await page.locator("dialog.t-auth[open]").waitFor({ state: "detached" });
    if (await page.locator("dialog.t-notice[open]").count()) await page.getByRole("button", { name: "Mengerti", exact: true }).click();
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await page.getByRole("button", { name: "Tersimpan", exact: true }).waitFor();
    const section = (name) => page.locator(width < 860 ? ".t-account__mobiletabs" : ".t-account__side").getByRole("button", { name, exact: true }).click();
    await page.goto(base + "#my");
    await section("Ingin dikunjungi");
    await page.getByRole("heading", { name: "Tempat wishlist uji", exact: true }).waitFor();
    await page.screenshot({ path: `.qa/personal-${width}-wishlist.png`, fullPage: true });
    await page.getByLabel("Kota", { exact: true }).selectOption("osm:relation:16563796");
    await page.getByRole("button", { name: "Lihat di peta", exact: true }).click();
    await page.locator(".leaflet-popup-content").filter({ hasText: "Tempat wishlist uji" }).waitFor();
    await page.goto(base + "#my"); await section("Ingin dikunjungi");
    await page.getByRole("button", { name: "Tandai sudah dikunjungi", exact: true }).click();
    await section("Sudah dikunjungi");
    await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
    await page.getByLabel("Ceritamu", { exact: true }).fill("Tempat ini nyaman untuk dikunjungi bersama teman dan keluarga.");
    await page.getByRole("button", { name: "Kirim cerita untuk ditinjau", exact: true }).click();
    await page.getByText("Status cerita: Menunggu tinjauan").waitFor();
    await page.screenshot({ path: `.qa/personal-${width}-visited.png`, fullPage: true });
    await section("Linimasa");
    await page.getByText("Mengirim cerita kunjungan", { exact: true }).waitFor();
    await page.goto(base + "#admin");
    const queue = page.getByRole("region", { name: "Moderasi cerita kunjungan", exact: true });
    await queue.getByRole("button", { name: "Minta perbaikan cerita", exact: true }).click();
    await queue.getByRole("alert").filter({ hasText: "Tulis alasan" }).waitFor();
    await queue.getByRole("button", { name: "Terbitkan cerita", exact: true }).click();
    await queue.getByText("Tidak ada cerita pada status ini.").waitFor();
    await page.goto(base + "#komunitas");
    if (await page.locator("dialog.t-community-guide[open]").count()) await page.getByRole("button", { name: "Tutup panduan" }).click();
    await page.getByRole("region", { name: "Cerita kunjungan warga", exact: true }).getByText(story.body).waitFor();
    await page.goto(base + "#my"); await section("Sudah dikunjungi");
    await page.getByRole("button", { name: "Batalkan kunjungan", exact: true }).click();
    await section("Ingin dikunjungi");
    await page.getByRole("button", { name: "Hapus dari wishlist", exact: true }).click();
    await page.getByText(/Wishlist masih kosong/).waitFor();
    assert.equal(await page.locator(".t-personal__emptyart").count(), 0, "wishlist empty state uses a dashboard icon, not an illustration");
    assert.equal(await page.locator(".t-personal__emptymark svg").count(), 1, "wishlist empty state shows its icon");
    await section("Sudah dikunjungi");
    await page.getByText(/Belum ada kunjungan yang dicatat/).waitFor();
    assert.equal(await page.locator(".t-personal__emptyart").count(), 0, "visited empty state uses a dashboard icon, not an illustration");
    assert.equal(await page.locator(".t-personal__emptymark svg").count(), 1, "visited empty state shows its icon");
    await section("Ingin dikunjungi");
    failList = true;
    await page.reload(); await section("Ingin dikunjungi");
    await page.getByRole("alert").filter({ hasText: "Gangguan simpanan uji" }).waitFor();
    await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
    await page.getByText(/Wishlist masih kosong/).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `.qa/personal-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Keluar dari akun", exact: true }).click();
    await page.getByRole("button", { name: "Masuk", exact: true }).first().waitFor();
    await page.goto(base + "#my"); await section("Linimasa");
    assert.equal(await page.getByText("Mengirim cerita kunjungan", { exact: true }).count(), 0, "Signed-out views never retain private timeline events");
    assert.ok(await page.getByText("Masuk untuk menyimpan tempat dan melihat riwayat pribadimu.", { exact: true }).isVisible());
    console.log(`PASS ${width}: save/login, wishlist/filter/map, visit, story, moderation, public story, private timeline, remove and retry`);
    await page.close();
  }
} finally { await browser.close(); }
