import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { stripTypeScriptTypes } from "node:module";
import { pathToFileURL } from "node:url";

/**
 * Bulk import destinasi Pekanbaru dari stiker landmark.
 *
 * Sumber koordinat (Nominatim, sesuai kebijakan OSM):
 *   1. ATLAS_PLACES (src/data/atlas.ts): OSM ID yang sudah ditelusuri tangan,
 *      diambil koordinatnya lewat /lookup (satu permintaan per 50 ID).
 *   2. /search dengan nama + alias untuk stiker tanpa entri atlas.
 *   Tidak ada Overpass: endpoint publiknya tidak stabil dari lingkungan ini.
 *
 * Aturan:
 *   - Tidak ada koordinat karangan. Baris tanpa hasil disimpan di
 *     `.qa/import/unresolved.json` dan tidak dimasukkan ke database.
 *   - Hasil disimpan di `.qa/import/coordinates.json` dan dipakai ulang (cache),
 *     jadi menjalankan ulang tidak memanggil API lagi.
 *   - Permintaan dibatasi: satu panggilan Nominatim per 1,1 detik,
 *     User-Agent jelas, dan hasil di-cache.
 *   - Import ke database lewat RPC admin_import_destinations (idempoten).
 *
 * Pemakaian:
 *   node scripts/import-destinations.mjs --geocode        # isi cache koordinat
 *   node scripts/import-destinations.mjs --push           # kirim ke Supabase
 *   node scripts/import-destinations.mjs --geocode --push # keduanya
 *   node scripts/import-destinations.mjs --city "osm:relation:16563796" --push
 */

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE_PATH = path.join(ROOT, ".qa/import/coordinates.json");
const UNRESOLVED_PATH = path.join(ROOT, ".qa/import/unresolved.json");
const STICKERS_DIR = path.join(ROOT, "public/assets/stickers");
const UA = "TapetaImport/1.0 (bulk landmark import; TAPETA Pekanbaru)";
const NOMINATIM = "https://nominatim.openstreetmap.org";
// Bbox Pekanbaru (kota + pinggiran), agar hasil di luar kota ditolak.
const BBOX = { south: 0.36, west: 101.25, north: 0.72, east: 101.72 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}
const hasFlag = (name) => process.argv.includes(name);

// ---------------------------------------------------------------------------
// 1. Muat modul TypeScript sumber tanpa build step
// ---------------------------------------------------------------------------
async function loadCatalog() {
  // stickerManifest mengimpor atlas secara relatif; salin keduanya ke satu folder
  // agar resolusi ESM tetap bekerja.
  const dir = path.join(ROOT, ".qa/import/modules");
  await mkdir(dir, { recursive: true });
  for (const file of ["atlas.ts", "stickerManifest.ts"]) {
    const source = await readFile(path.join(ROOT, "src/data", file), "utf8");
    const js = stripTypeScriptTypes(source).replace(/from "\.\/atlas"/g, 'from "./atlas.mjs"');
    await writeFile(path.join(dir, file.replace(/\.ts$/, ".mjs")), js);
  }
  const manifest = await import(pathToFileURL(path.join(dir, "stickerManifest.mjs")).href + `?v=${Date.now()}`);
  const atlas = await import(pathToFileURL(path.join(dir, "atlas.mjs")).href + `?v=${Date.now()}`);
  return { landmarks: manifest.STICKER_LANDMARKS, atlasPlaces: atlas.ATLAS_PLACES };
}

async function loadCityRegions() {
  const geo = JSON.parse(await readFile(path.join(ROOT, "public/data/pekanbaru-kecamatan.geojson"), "utf8"));
  return (geo.features ?? []).map((feature) => ({
    code: feature.properties?.code ?? null,
    name: feature.properties?.name ?? null,
    boundary: feature.geometry ?? null,
  }));
}

async function stickerFiles() {
  const files = await readdir(STICKERS_DIR);
  return files.filter((file) => file.endsWith(".png")).map((file) => file.replace(/\.png$/, ""));
}

// ---------------------------------------------------------------------------
// 2. Pencocokan stiker ke katalog
// ---------------------------------------------------------------------------
function matchStickers(files, landmarks) {
  const byAsset = new Map(landmarks.map((item) => [item.asset, item]));
  const matched = [];
  const unmatched = [];
  for (const asset of files) {
    const entry = byAsset.get(asset);
    if (entry) matched.push(entry);
    else unmatched.push(asset);
  }
  return { matched, unmatched };
}

// ---------------------------------------------------------------------------
// 3. Koordinat dari atlas (OSM ID sudah ditelusuri tangan)
// ---------------------------------------------------------------------------
function fromAtlas(atlasPlaces) {
  const map = new Map();
  for (const place of atlasPlaces) {
    const match = /openstreetmap\.org\/(node|way|relation)\/(\d+)/.exec(place.osmUrl);
    if (!match) continue;
    map.set(place.slug, {
      osm_type: match[1],
      osm_id: Number(match[2]),
      source: "atlas",
      confidence: place.precision,
      area: place.area,
      name: place.label,
    });
  }
  return map;
}

// ---------------------------------------------------------------------------
// 4. Nominatim lookup berdasarkan OSM ID atlas (batch 50, 1 permintaan)
// ---------------------------------------------------------------------------
let nominatimLast = 0;
async function throttleNominatim() {
  const wait = Math.max(0, 1100 - (Date.now() - nominatimLast));
  if (wait > 0) await sleep(wait);
  nominatimLast = Date.now();
}

async function nominatimLookup(entries) {
  const out = [];
  for (let index = 0; index < entries.length; index += 50) {
    const chunk = entries.slice(index, index + 50);
    await throttleNominatim();
    const url = new URL(`${NOMINATIM}/lookup`);
    url.searchParams.set("osm_ids", chunk.map((entry) => `${entry.osm_type[0].toUpperCase()}${entry.osm_id}`).join(","));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("extratags", "1");
    url.searchParams.set("addressdetails", "1");
    const response = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Nominatim lookup HTTP ${response.status}`);
    out.push(...(await response.json()));
  }
  return out;
}

function pickTags(tags = {}) {
  const keep = ["name", "name:id", "amenity", "tourism", "shop", "historic", "leisure", "building", "addr:street", "addr:suburb", "addr:city", "wikidata", "wikipedia"];
  const out = {};
  for (const key of keep) if (tags[key]) out[key] = tags[key];
  return out;
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORD = new Set(["pekanbaru", "kota", "provinsi", "riau", "raya", "agung"]);

function nameTokens(value) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 2 && !STOPWORD.has(token));
}

// ---------------------------------------------------------------------------
// 5. Nominatim (fallback), 1 permintaan / 1,1 detik
// ---------------------------------------------------------------------------
async function nominatimSearch(query) {
  await throttleNominatim();
  const url = new URL(`${NOMINATIM}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("viewbox", `${BBOX.west},${BBOX.north},${BBOX.east},${BBOX.south}`);
  url.searchParams.set("bounded", "1");
  url.searchParams.set("countrycodes", "id");
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
  return response.json();
}

function inBbox(lat, lon) {
  return lat > BBOX.south && lat < BBOX.north && lon > BBOX.west && lon < BBOX.east;
}

// ---------------------------------------------------------------------------
// 6. Resolusi koordinat
// ---------------------------------------------------------------------------
async function geocode() {
  const { landmarks, atlasPlaces } = await loadCatalog();
  const files = await stickerFiles();
  const { matched, unmatched } = matchStickers(files, landmarks);
  const atlas = fromAtlas(atlasPlaces);
  const cityRegions = await loadCityRegions();

  const cache = existsSync(CACHE_PATH)
    ? JSON.parse(await readFile(CACHE_PATH, "utf8"))
    : { version: 1, updatedAt: null, landmarks: {}, unresolved: {} };
  cache.landmarks ??= {};
  cache.unresolved ??= {};

  const force = hasFlag("--refresh");
  const pending = matched.filter((entry) => force || !cache.landmarks[entry.asset]);

  console.log(`Stiker: ${files.length} · cocok katalog: ${matched.length} · tak cocok: ${unmatched.length}`);
  console.log(`Atlas OSM ID: ${atlas.size} · perlu diproses: ${pending.length}`);

  if (pending.length > 0) {
    const byId = pending.map((entry) => atlas.get(entry.asset)).filter(Boolean);

    console.log(`Nominatim lookup: ${byId.length} OSM ID…`);
    const lookedUp = byId.length > 0 ? await nominatimLookup(byId) : [];
    console.log(`Nominatim lookup: ${lookedUp.length} objek ditemukan`);

    for (const entry of pending) {
      const atlasEntry = atlas.get(entry.asset);
      const tokens = nameTokens(`${entry.name} ${entry.tags.join(" ")}`);

      if (atlasEntry) {
        const found = lookedUp.find(
          (item) => item.osm_type === atlasEntry.osm_type && Number(item.osm_id) === atlasEntry.osm_id,
        );
        if (!found) {
          cache.unresolved[entry.asset] = { name: entry.name, reason: "OSM ID atlas tidak ditemukan di Nominatim" };
          delete cache.landmarks[entry.asset];
          continue;
        }
        const osmName = found.name ?? found.display_name ?? atlasEntry.name;
        const nameMatches = nameTokens(osmName).some((token) => tokens.includes(token));
        const tags = pickTags({ ...found.extratags, name: osmName });
        const weakGeometry = Boolean(tags.highway || tags.waterway || tags.route);
        const outsideCity = !regionFor(cityRegions, Number(found.lat), Number(found.lon));
        cache.landmarks[entry.asset] = {
          asset: entry.asset,
          name: entry.name,
          categoryId: entry.categoryId,
          osm_type: atlasEntry.osm_type,
          osm_id: atlasEntry.osm_id,
          lat: Number(found.lat),
          lon: Number(found.lon),
          osm_name: osmName,
          source: "nominatim-lookup",
          confidence: atlasEntry.confidence === "approximate" || !nameMatches || weakGeometry ? "approximate" : "exact",
          area_hint: atlasEntry.area,
          tags,
          resolvedAt: new Date().toISOString(),
        };
        const reasons = [];
        if (atlasEntry.confidence === "approximate") reasons.push("Titik atlas bersifat perkiraan");
        if (!nameMatches) reasons.push("Nama OSM tidak sama dengan nama stiker");
        if (weakGeometry) reasons.push("Objek OSM berupa jalan/sungai, bukan bangunan atau taman");
        if (outsideCity) reasons.push("Titik di luar batas kecamatan Pekanbaru");
        if (reasons.length > 0) {
          cache.landmarks[entry.asset].needs_verification = true;
          cache.landmarks[entry.asset].outside_city = outsideCity;
          cache.unresolved[entry.asset] = { name: entry.name, reason: reasons.join("; ") };
        } else {
          delete cache.unresolved[entry.asset];
        }
        continue;
      }

      const result = await nominatimSearch(`${entry.name} Pekanbaru`);
      const best = result
        .map((item) => ({
          item,
          lat: Number(item.lat),
          lon: Number(item.lon),
          score: nameTokens(item.name ?? item.display_name).filter((token) => tokens.includes(token)).length,
        }))
        .filter((item) => inBbox(item.lat, item.lon))
        .sort((a, b) => b.score - a.score)[0];

      if (!best || best.score === 0) {
        cache.unresolved[entry.asset] = { name: entry.name, reason: "Tidak ditemukan di Nominatim" };
        delete cache.landmarks[entry.asset];
        continue;
      }

      const item = best.item;
      cache.landmarks[entry.asset] = {
        asset: entry.asset,
        name: entry.name,
        categoryId: entry.categoryId,
        osm_type: item.osm_type,
        osm_id: Number(item.osm_id),
        lat: best.lat,
        lon: best.lon,
        osm_name: item.name ?? item.display_name ?? null,
        source: "nominatim-search",
        confidence: best.score >= 2 ? "exact" : "approximate",
        score: best.score,
        tags: pickTags({ ...item.extratags, name: item.name }),
        resolvedAt: new Date().toISOString(),
        ...(best.score < 2 ? { needs_verification: true } : {}),
      };
      if (best.score < 2) cache.unresolved[entry.asset] = { name: entry.name, reason: "Nama hanya cocok sebagian" };
      else delete cache.unresolved[entry.asset];
    }
  }

  cache.updatedAt = new Date().toISOString();
  cache.unmatchedFiles = unmatched;
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));

  const resolved = Object.values(cache.landmarks);
  console.log(`Koordinat tersimpan: ${resolved.length} · ambigu: ${resolved.filter((item) => item.needs_verification).length} · belum terselesaikan: ${Object.keys(cache.unresolved).length}`);
  return cache;
}

// ---------------------------------------------------------------------------
// 7. Dorong ke Supabase lewat RPC admin
// ---------------------------------------------------------------------------
async function push(cityId) {
  const cache = JSON.parse(await readFile(CACHE_PATH, "utf8"));
  const { createClient } = await import("@supabase/supabase-js");
  const env = await readEnv();
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY tidak ada di .env.local");
  if (!env.SUPABASE_IMPORT_EMAIL || !env.SUPABASE_IMPORT_PASSWORD) {
    throw new Error("Isi SUPABASE_IMPORT_EMAIL dan SUPABASE_IMPORT_PASSWORD (akun moderator) di .env.local");
  }

  const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({
    email: env.SUPABASE_IMPORT_EMAIL,
    password: env.SUPABASE_IMPORT_PASSWORD,
  });
  if (signInError) throw signInError;

  const cityRegions = await loadCityRegions();
  const skipped = Object.values(cache.landmarks).filter((entry) => entry.outside_city);
  const rows = Object.values(cache.landmarks).filter((entry) => !entry.outside_city).map((entry) => {
    const region = regionFor(cityRegions, entry.lat, entry.lon);
    return {
      city_id: cityId,
      sticker_slug: entry.asset,
      name: entry.name,
      category_id: entry.categoryId,
      address: buildAddress(entry),
      description: entry.osm_name ? `Nama OSM: ${entry.osm_name}` : null,
      lat: entry.lat,
      lon: entry.lon,
      region_code: region?.code ?? null,
      source_url: `https://www.openstreetmap.org/${entry.osm_type}/${entry.osm_id}`,
      source_label: "OpenStreetMap",
      coordinate_source: entry.source,
      coordinate_confidence: entry.confidence ?? "exact",
      osm_type: entry.osm_type,
      osm_id: entry.osm_id,
    };
  });

  const batch = `stickers-${new Date().toISOString().slice(0, 10)}`;
  const { data, error } = await client.rpc("admin_import_destinations", { p_rows: rows, p_batch: batch });
  if (error) throw error;
  console.log("Import:", JSON.stringify(data));

  const unresolved = Object.entries(cache.unresolved ?? {}).map(([asset, info]) => ({
    sticker_slug: asset,
    name: info.name,
    reason: info.reason,
  }));
  for (const entry of skipped) {
    if (!unresolved.some((item) => item.sticker_slug === entry.asset)) {
      unresolved.push({ sticker_slug: entry.asset, name: entry.name, reason: "Titik di luar batas kecamatan Pekanbaru" });
    }
  }
  await mkdir(path.dirname(UNRESOLVED_PATH), { recursive: true });
  await writeFile(UNRESOLVED_PATH, JSON.stringify({ batch, generatedAt: new Date().toISOString(), unresolved, unmatchedFiles: cache.unmatchedFiles ?? [] }, null, 2));
  console.log(`Perlu verifikasi: ${unresolved.length} · lihat .qa/import/unresolved.json`);
}

async function readEnv() {
  const text = await readFile(path.join(ROOT, ".env.local"), "utf8").catch(() => "");
  const env = {};
  for (const line of text.split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

// Titik-dalam-poligon untuk memetakan kecamatan dari batas GeoJSON.
function regionFor(regions, lat, lon) {
  if (lat === null || lon === null) return null;
  for (const region of regions) {
    if (region.boundary && pointInGeometry(lon, lat, region.boundary)) return region;
  }
  return null;
}

function pointInGeometry(lon, lat, geometry) {
  if (!geometry) return false;
  if (geometry.type === "Polygon") return pointInPolygon(lon, lat, geometry.coordinates);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.some((polygon) => pointInPolygon(lon, lat, polygon));
  return false;
}

function pointInPolygon(lon, lat, rings) {
  if (!rings?.length) return false;
  if (!pointInRing(lon, lat, rings[0])) return false;
  return !rings.slice(1).some((hole) => pointInRing(lon, lat, hole));
}

function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function buildAddress(entry) {
  const tags = entry.tags ?? {};
  return tags["addr:street"] ?? tags["addr:suburb"] ?? "";
}

// ---------------------------------------------------------------------------
async function main() {
  const cityId = arg("--city", "osm:relation:16563796");
  if (!hasFlag("--geocode") && !hasFlag("--push")) {
    console.log("Gunakan --geocode, --push, atau keduanya. Lihat komentar berkas.");
    return;
  }
  if (hasFlag("--geocode")) await geocode();
  if (hasFlag("--push")) await push(cityId);
}

await main();
