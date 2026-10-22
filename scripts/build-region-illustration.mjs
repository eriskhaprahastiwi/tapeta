import { readFileSync, writeFileSync } from "node:fs";

const source = "public/data/pekanbaru-kecamatan.geojson";
const out = "src/data/regionsIllustration.ts";
const EPS_PX = 2.2;

const geo = JSON.parse(readFileSync(source, "utf8"));

function perpDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  const cx = a.x + t * dx, cy = a.y + t * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}
function simplify(points, eps) {
  if (points.length < 4) return points;
  let maxD = 0, idx = 0;
  const first = points[0], last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDistance(points[i], first, last);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [first, last];
  const left = simplify(points.slice(0, idx + 1), eps);
  const right = simplify(points.slice(idx), eps);
  return [...left.slice(0, -1), ...right];
}

const all = [];
const features = geo.features.map((f) => {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const rings = [];
  let count = 0;
  for (const poly of polys) {
    const ring = poly[0].filter((_, i) => i % 1 === 0);
    count += ring.length;
    for (const [lon, lat] of ring) all.push({ lon, lat });
    rings.push(ring);
  }
  return { code: f.properties.code, name: f.properties.name, rings, count };
});
const total = features.reduce((s, f) => s + f.count, 0);
console.log("features", features.length, "points", total);

// bounds from all coordinates
let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
for (const f of features) for (const ring of f.rings) for (const [lon, lat] of ring) {
  if (lon < west) west = lon;
  if (lon > east) east = lon;
  if (lat < south) south = lat;
  if (lat > north) north = lat;
}
console.log("bounds", { west, east, south, north });
const W = 1000;
const H = Math.round(W * ((north - south) / (east - west)));
console.log("viewBox", W, H);

const outFeatures = features.map((f) => {
  let labelAcc = [];
  const paths = f.rings.map((ring) => {
    let pts = ring.map(([lon, lat]) => ({
      x: ((lon - west) / (east - west)) * W,
      y: ((north - lat) / (north - south)) * H,
    }));
    pts = simplify(pts, EPS_PX);
    labelAcc.push(...pts);
    const d = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ") + " Z";
    return d;
  });
  // rough label point: centroid of all simplified points of first ring
  const ring0 = f.rings[0].map(([lon, lat]) => ({ x: ((lon - west) / (east - west)) * W, y: ((north - lat) / (north - south)) * H }));
  const cx = ring0.reduce((s, p) => s + p.x, 0) / ring0.length;
  const cy = ring0.reduce((s, p) => s + p.y, 0) / ring0.length;
  return { code: f.code, name: f.name, labelX: Math.round(cx), labelY: Math.round(cy), paths };
});

const simplifiedCount = outFeatures.reduce((s, f) => s + f.paths.join("").length, 0);
console.log("output path chars", simplifiedCount, "viewBox", `${W}x${H}`);

const ts = `export interface RegionIllustration {
  code: string;
  name: string;
  labelX: number;
  labelY: number;
  paths: string[];
}

export const REGION_VIEWBOX = { width: ${W}, height: ${H}, west: ${west}, east: ${east}, south: ${south}, north: ${north} };

export const REGION_ILLUSTRATIONS: RegionIllustration[] = ${JSON.stringify(outFeatures)};
`;
writeFileSync(out, ts);
console.log("wrote", out);
