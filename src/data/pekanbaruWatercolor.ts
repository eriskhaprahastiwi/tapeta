/**
 * Kalibrasi geografis ilustrasi cat air Kota Pekanbaru.
 *
 * Asset: public/assets/map/pekanbaru-watercolor-v2.png (1278 × 1230 px)
 * Batas administratif: public/data/pekanbaru-kecamatan.geojson
 *   (OSM via Nominatim, ODbL; bbox 101.324004–101.605402 BT, 0.420395–0.690923 LU)
 *
 * Cara nilai ini diperoleh (dapat diulang):
 *   1. Render peta referensi dari OSM relation 16563796 (batas kota, jalan
 *      utama, sungai, danau) dalam Web Mercator ke bounds di bawah: bbox kota
 *      ditambah margin 3% lebar di tiap sisi.
 *   2. Ilustrasi digambar dengan menjiplak peta referensi itu, lalu diekspor
 *      dengan rasio kanvas yang sama. Bounds gambar = bounds peta referensi.
 *   3. Verifikasi: batas kota dan jalan trunk OSM yang ditumpuk di atas
 *      ilustrasi jatuh tepat di garis yang digambar.
 *
 * Bounds di bawah sengaja lebih lebar dari bbox kota karena kanvas menyisakan
 * margin cat air. Memakai bbox kota langsung akan mengecilkan ilustrasi terhadap
 * OSM.
 *
 * Verifikasi ulang yang disarankan di masa depan: buka Explore, aktifkan overlay,
 * lalu pastikan garis batas cat air mengikuti garis batas kecamatan saat zoom 12–14.
 */
export const PEKANBARU_WATERCOLOR_BOUNDS = {
  west: 101.315562,
  south: 0.411953,
  east: 101.613844,
  north: 0.699364,
} as const;

/** Bbox garis pantai Pekanbaru yang digambar di dalam aset (piksel). */
export const PEKANBARU_WATERCOLOR_OUTLINE = {
  left: 36 / 1278,
  top: 36 / 1230,
  right: 1242 / 1278,
  bottom: 1194 / 1230,
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
  width: 1278,
  height: 1230,
  bounds: PEKANBARU_WATERCOLOR_BOUNDS,
  /** Relation OSM kota Pekanbaru yang menjadi acuan kalibrasi. */
  relationId: 16563796,
  calibration: {
    method: "traced over OSM reference map rendered to these exact bounds",
    outlinePx: { left: 36, top: 36, right: 1242, bottom: 1194 },
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
