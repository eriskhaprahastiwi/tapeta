const CANDIDATES = [
  "Masjid Agung An-Nur Pekanbaru",
  "Tugu Zapin Pekanbaru",
  "Museum Sang Nila Utama Pekanbaru",
  "Pasar Bawah Pekanbaru",
  "Taman Rekreasi Alam Mayang Pekanbaru",
  "Danau Buatan Pekanbaru",
  "Danau Tuanku Tambusai Pekanbaru",
  "Mal SKA Pekanbaru",
  "Plaza Senapelan Pekanbaru",
  "Living World Pekanbaru",
  "Bandar Udara Sultan Syarif Kasim II",
  "Stadion Utama Riau",
  "Jembatan Siak IV Pekanbaru",
  "RTH Putri Kaca Mayang Pekanbaru",
  "Pondok Patin H. M. Yunus Pekanbaru",
  "Starbucks Plaza Senapelan Pekanbaru",
  "Kopi Janji Jiwa Sudirman Pekanbaru",
  "Tomoro Coffee Pekanbaru",
  "Kedai Kopi Kimteng Pekanbaru",
  "Soto Cak Kholil Pekanbaru",
  "Taman Kota Diponegoro Pekanbaru",
  "Hutan Kota Pekanbaru",
];

const UA = "PekanbaruMap/0.1 (seed data lookup for local dev scaffold)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "3");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("addressdetails", "1");
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const output = [];
for (const [index, query] of CANDIDATES.entries()) {
  if (index > 0) await sleep(1300);
  process.stdout.write(`${query}... `);
  try {
    const results = await search(query);
    const match = results.find((item) => {
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      return lat > 0.38 && lat < 0.7 && lon > 101.3 && lon < 101.65;
    });
    if (!match) {
      console.log("NOT FOUND");
      output.push({ query, found: false });
      continue;
    }
    console.log(`${match.lat}, ${match.lon}`);
    output.push({
      query,
      found: true,
      name: match.name,
      display_name: match.display_name,
      lat: Number(match.lat),
      lon: Number(match.lon),
      osm_type: match.osm_type,
      osm_id: match.osm_id,
      category: match.category,
      type: match.type,
      extratags: match.extratags ?? {},
      address: match.address ?? {},
    });
  } catch (error) {
    console.log(`ERROR ${error.message}`);
    output.push({ query, found: false, error: error.message });
  }
}

import { writeFile } from "node:fs/promises";
await writeFile("/tmp/dest-candidates.json", JSON.stringify(output, null, 2));
console.log(`\nWrote ${output.length} candidates to /tmp/dest-candidates.json`);
