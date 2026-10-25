/**
 * Kalibrasi geografis ilustrasi cat air Kota Pekanbaru.
 *
 * Asset: public/assets/map/pekanbaru-watercolor-v2.png (1494 × 1053 px)
 * Batas administratif: public/data/pekanbaru-kecamatan.geojson
 *   (OSM via Nominatim, ODbL; bbox 101.324004–101.605402 BT, 0.420395–0.690923 LU)
 *
 * Cara nilai ini diperoleh (dapat diulang):
 *   1. Ukur bbox garis batas kota pada ilustrasi: x 220–1255, y 18–995 dari
 *      kanvas 1494 × 1053. Garis ini adalah batas administratif yang digambar.
 *   2. Petakan bbox tersebut ke bbox GeoJSON kecamatan OSM; piksel di luar garis
 *      adalah margin cat air dan tetap menjadi bagian dari bounds gambar.
 *   3. Konversi vertikal memakai Mercator agar hasilnya identik dengan proyeksi
 *      Leaflet pada semua level zoom.
 *
 * Bounds di bawah sengaja lebih lebar dari bbox kota karena kanvas menyisakan
 * margin cat air. Memakai bbox kota langsung akan mengecilkan ilustrasi terhadap
 * OSM.
 *
 * Verifikasi ulang yang disarankan di masa depan: buka Explore, aktifkan overlay,
 * lalu pastikan garis batas cat air mengikuti garis batas kecamatan saat zoom 12–14.
 */
export const PEKANBARU_WATERCOLOR_BOUNDS = {
  west: 101.26419,
  south: 0.404334,
  east: 101.670382,
  north: 0.695907,
} as const;

/** Bbox garis pantai Pekanbaru yang digambar di dalam aset (piksel). */
export const PEKANBARU_WATERCOLOR_OUTLINE = {
  left: 220 / 1494,
  top: 18 / 1053,
  right: 1255 / 1494,
  bottom: 995 / 1053,
} as const;

/** Bbox kota pada koordinat OSM, sasaran klip overlay. */
export const PEKANBARU_CITY_BBOX = {
  west: 101.324004,
  south: 0.420395,
  east: 101.605402,
  north: 0.690923,
} as const;

export const PEKANBARU_WATERCOLOR = {
  src: "/assets/map/pekanbaru-watercolor-v2.png",
  width: 1494,
  height: 1053,
  bounds: PEKANBARU_WATERCOLOR_BOUNDS,
  /** Relation OSM kota Pekanbaru yang menjadi acuan kalibrasi. */
  relationId: 16563796,
  calibration: {
    method: "outline pixel bbox mapped to OSM administrative bbox",
    outlinePx: { left: 220, top: 18, right: 1255, bottom: 995 },
    projection: "Web Mercator",
  },
  attribution: "Cakupan: batas admin OSM (ODbL) · ilustrasi cat air TAPETA",
} as const;

/** Daerah inti agar peta tidak keluar jauh dari Pekanbaru. */
export const PEKANBARU_FIT_BOUNDS = {
  west: 101.316187,
  south: 0.416252,
  east: 101.615624,
  north: 0.688852,
} as const;
