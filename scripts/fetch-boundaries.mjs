import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DISTRICTS = [
  { code: "14.71.01", name: "Sukajadi", osmId: 18727801 },
  { code: "14.71.02", name: "Pekanbaru Kota", osmId: 18716281 },
  { code: "14.71.03", name: "Sail", osmId: 18608405 },
  { code: "14.71.04", name: "Lima Puluh", osmId: 18721736 },
  { code: "14.71.05", name: "Senapelan", osmId: 18724764 },
  { code: "14.71.06", name: "Rumbai Barat", osmId: 18494688 },
  { code: "14.71.07", name: "Bukit Raya", osmId: 18521663 },
  { code: "14.71.08", name: "Binawidya", osmId: 17889199 },
  { code: "14.71.09", name: "Marpoyan Damai", osmId: 17859274 },
  { code: "14.71.10", name: "Tenayan Raya", osmId: 18636244 },
  { code: "14.71.11", name: "Payung Sekaki", osmId: 17890495 },
  { code: "14.71.12", name: "Rumbai", osmId: 18493626 },
  { code: "14.71.13", name: "Tuah Madani", osmId: 17889200 },
  { code: "14.71.14", name: "Kulim", osmId: 8269824 },
  { code: "14.71.15", name: "Rumbai Timur", osmId: 17872023 },
];

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "PekanbaruMap/0.1 (boundary import for local dev scaffold)";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchNominatim(params) {
  const url = new URL(ENDPOINT);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function searchDistrict(district, query) {
  const results = await fetchNominatim({
    q: query,
    format: "jsonv2",
    limit: "5",
    polygon_geojson: "1",
    addressdetails: "1",
  });
  return results.find(
    (item) =>
      item.osm_type === "relation" &&
      item.type === "administrative" &&
      item.osm_id !== 16563796 &&
      item.display_name.toLowerCase().includes("pekanbaru") &&
      item.geojson &&
      ["Polygon", "MultiPolygon"].includes(item.geojson.type),
  );
}

async function lookupDistrict(osmId) {
  const url = new URL("https://nominatim.openstreetmap.org/lookup");
  url.searchParams.set("osm_ids", `R${osmId}`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("polygon_geojson", "1");
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`lookup ${osmId}: HTTP ${response.status}`);
  const results = await response.json();
  return results.find((item) => item.geojson && ["Polygon", "MultiPolygon"].includes(item.geojson.type));
}

async function fetchDistrict(district) {
  if (district.osmId) {
    const match = await lookupDistrict(district.osmId);
    if (match) return match;
  }
  const queries = [
    `${district.name}, Pekanbaru, Riau, Indonesia`,
    `Kecamatan ${district.name}, Pekanbaru, Riau, Indonesia`,
  ];
  for (const query of queries) {
    const match = await searchDistrict(district, query);
    if (match) return match;
    await sleep(1200);
  }
  throw new Error(`${district.name}: no administrative polygon found`);
}

async function main() {
  const features = [];

  for (const [index, district] of DISTRICTS.entries()) {
    if (index > 0) await sleep(1200);
    process.stdout.write(`${district.code} ${district.name}... `);
    let match;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        match = await fetchDistrict(district);
        break;
      } catch (error) {
        if (attempt === 3) throw error;
        process.stdout.write(`retry ${attempt}... `);
        await sleep(2500);
      }
    }
    process.stdout.write(`relation ${match.osm_id}\n`);
    features.push({
      type: "Feature",
      properties: {
        id: `osm-${match.osm_id}`,
        name: district.name,
        code: district.code,
        region_type: "kecamatan",
        source: "OpenStreetMap contributors",
        source_url: `https://www.openstreetmap.org/relation/${match.osm_id}`,
        license: "ODbL 1.0",
      },
      geometry: match.geojson,
    });
  }

  const collection = {
    type: "FeatureCollection",
    metadata: {
      name: "Batas kecamatan Kota Pekanbaru",
      region: "Kota Pekanbaru, Riau, Indonesia",
      retrieved_at: new Date().toISOString(),
      source: "OpenStreetMap via Nominatim",
      license: "ODbL 1.0, © OpenStreetMap contributors",
      note: "Batas administratif dapat berubah. Verifikasi terhadap sumber resmi sebelum produksi.",
    },
    features,
  };

  const output = path.join(process.cwd(), "public", "data", "pekanbaru-kecamatan.geojson");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(collection));
  console.log(`Wrote ${features.length} districts to ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
