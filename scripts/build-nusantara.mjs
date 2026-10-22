import { readFile, writeFile } from "node:fs/promises";

// Country geometry supplies the complete coastlines; the existing artwork is
// used only as watercolor texture, never as a coordinate reference.
const source = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const response = await fetch(source);
if (!response.ok) throw new Error(`Natural Earth: HTTP ${response.status}`);
const collection = await response.json();
const included = new Set(["IDN", "PNG", "MYS", "BRN", "TLS"]);
const project = ([lon, lat]) => [((lon - 94) / 64) * 1440, ((8 - lat) / 20) * 510];
const paths = [];
for (const feature of collection.features) {
  if (!included.has(feature.properties.ADM0_A3)) continue;
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  for (const polygon of polygons) {
    // Exclude the Malay peninsula, retain the whole of Borneo and New Guinea.
    if (feature.properties.ADM0_A3 === "MYS" && polygon[0].some(([lon]) => lon < 108)) continue;
    paths.push(polygon.map((ring) => `M${ring.map((point) => project(point).map((v) => v.toFixed(2)).join(",")).join("L")}Z`).join(""));
  }
}
if (paths.length < 50) throw new Error("Coastline extraction unexpectedly incomplete");
const texture = (await readFile(new URL("../public/assets/map/nusantara-watercolor-v2.png", import.meta.url))).toString("base64");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 550" role="img" aria-labelledby="title desc">
<title id="title">Nusantara, ilustrasi cat air</title><desc id="desc">Kepulauan dari Sumatra hingga Papua. Siluet Natural Earth 1:50m, public domain. Warna editorial TAPETA, bukan peta navigasi.</desc>
<defs>
<linearGradient id="sea" x2="0" y2="1"><stop stop-color="#f7f0e4"/><stop offset=".5" stop-color="#bfe4e2"/><stop offset="1" stop-color="#f7f0e4"/></linearGradient>
<linearGradient id="land" x2=".8" y2="1"><stop stop-color="#d79766"/><stop offset=".35" stop-color="#eee1cd"/><stop offset=".65" stop-color="#a5b59a"/><stop offset="1" stop-color="#e7c3c6"/></linearGradient>
<filter id="wash"><feTurbulence type="fractalNoise" baseFrequency=".025" numOctaves="3" seed="14"/><feColorMatrix type="saturate" values="0"/><feBlend in="SourceGraphic" mode="soft-light"/></filter>
<clipPath id="land-clip"><path d="${paths.join(" ")}" fill-rule="evenodd"/></clipPath>
</defs>
<rect width="1440" height="550" fill="url(#sea)"/>
<g clip-path="url(#land-clip)"><rect width="1440" height="550" fill="url(#land)"/><image href="data:image/png;base64,${texture}" width="1440" height="550" preserveAspectRatio="none" opacity=".35"/><rect width="1440" height="550" fill="url(#land)" filter="url(#wash)" opacity=".45"/></g>
<path d="${paths.join(" ")}" fill="none" stroke="#786e5f" stroke-opacity=".2" stroke-width=".7"/>
</svg>`;
await writeFile(new URL("../public/assets/map/nusantara-complete.svg", import.meta.url), svg);
await writeFile(new URL("../public/assets/map/nusantara-complete.source.json", import.meta.url), JSON.stringify({ source, retrievedAt: new Date().toISOString(), license: "Natural Earth public domain", scale: "1:50m", includes: [...included], note: "Whole-island editorial composition. Not a navigation map; original watercolor retained." }, null, 2));
console.log(`Built complete Nusantara silhouette from ${paths.length} polygons.`);
