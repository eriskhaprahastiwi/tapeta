import type { RegionFeature } from "../types";
import {
  PEKANBARU_CITY_BBOX,
  PEKANBARU_WATERCOLOR,
} from "../data/pekanbaruWatercolor";

/** Trace batas kecamatan ke path kanvas, mengikuti kalibrasi aset. */
function traceBoundary(context: CanvasRenderingContext2D, regions: RegionFeature[]) {
  const { width, height, bounds } = PEKANBARU_WATERCOLOR;
  const mapX = (lon: number) =>
    ((lon - bounds.west) / (bounds.east - bounds.west)) * width;
  const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const northY = mercatorY(bounds.north);
  const southY = mercatorY(bounds.south);
  const mapY = (lat: number) =>
    ((northY - mercatorY(lat)) / (northY - southY)) * height;

  context.beginPath();
  for (const region of regions) {
    const polygons =
      region.geometry.type === "Polygon" ? [region.geometry.coordinates] : region.geometry.coordinates;
    for (const polygon of polygons) {
      for (const ring of polygon) {
        ring.forEach(([lon, lat], index) => {
          const x = mapX(lon);
          const y = mapY(lat);
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.closePath();
      }
    }
  }
}

/**
 * Render ulang ilustrasi cat air sebagai PNG transparan yang dipotong ke batas
 * kecamatan Pekanbaru. Kertas di luar batas kota tidak pernah ikut tergambar,
 * jadi overlay tidak lagi berupa persegi opak di atas kota lain.
 *
 * Mengembalikan null bila aset gagal dimuat atau geometri tidak tersedia,
 * sehingga pemanggil bisa jatuh ke overlay biasa.
 */
export async function buildMaskedPekanbaruWatercolor(
  regions: RegionFeature[],
): Promise<string | null> {
  if (typeof document === "undefined" || regions.length === 0) return null;
  if (!isCalibrationSane()) return null;

  const image = new Image();
  image.src = PEKANBARU_WATERCOLOR.src;
  try {
    await image.decode();
  } catch {
    return null;
  }

  const { width, height } = PEKANBARU_WATERCOLOR;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  traceBoundary(context, regions);

  // 1. Potong ke batas kota.
  context.save();
  context.clip("evenodd");

  // 2. Gambar ilustrasi di dalam klip.
  context.drawImage(image, 0, 0, width, height);

  // 3. Lembutkan tepi: hapus pita tipis tepat di garis batas.
  context.globalCompositeOperation = "destination-out";
  context.strokeStyle = "rgba(0, 0, 0, 0.5)";
  context.lineWidth = 10;
  context.lineJoin = "round";
  context.stroke();
  context.restore();

  return canvas.toDataURL("image/png");
}

function isCalibrationSane() {
  const { west, east, south, north } = PEKANBARU_CITY_BBOX;
  const { west: bw, east: be, south: bs, north: bn } = PEKANBARU_WATERCOLOR.bounds;
  return west > bw && east < be && south > bs && north < bn;
}
