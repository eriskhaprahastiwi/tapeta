import { ATLAS_PLACES } from "./atlas";
import type { CategoryId } from "../types";

/**
 * Katalog stiker landmark Pekanbaru.
 *
 * Sumber tunggal untuk nama berkas stiker, nama destinasi, kategori, dan
 * pencocokannya ke ATLAS_PLACES. Dipakai oleh bulk import
 * (`scripts/import-destinations.mjs`) dan Explore (kartu pilihan lokasi).
 *
 * `asset` adalah nama berkas tanpa ekstensi di `public/assets/stickers/`.
 * `tags` membantu pencarian OSM ketika nama populer berbeda dari nama OSM.
 */
export interface StickerLandmark {
  asset: string;
  name: string;
  categoryId: CategoryId;
  /** Kata kunci tambahan untuk pencarian OSM. */
  tags: string[];
}

export const STICKER_LANDMARKS: StickerLandmark[] = [
  { asset: "anjung-seni-idrus-tintin", name: "Anjung Seni Idrus Tintin", categoryId: "budaya", tags: ["gedung", "seni"] },
  { asset: "asia-farm-pekanbaru", name: "Asia Farm Pekanbaru", categoryId: "rekreasi", tags: ["agrowisata"] },
  { asset: "asia-heritage", name: "Asia Heritage", categoryId: "rekreasi", tags: ["rumah gadang", "suku lima"] },
  { asset: "balai-adat-melayu-riau", name: "Balai Adat Melayu Riau", categoryId: "budaya", tags: ["adat", "melayu"] },
  { asset: "ciputra-seraya-mall", name: "Ciputra Seraya Mall", categoryId: "lainnya", tags: ["mal", "pusat perbelanjaan"] },
  { asset: "danau-bandar-khayangan", name: "Danau Bandar Khayangan", categoryId: "alam", tags: ["danau buatan", "danau"] },
  { asset: "jembatan-siak-i", name: "Jembatan Siak I", categoryId: "lainnya", tags: ["jembatan", "siak"] },
  { asset: "jembatan-siak-iv", name: "Jembatan Siak IV", categoryId: "lainnya", tags: ["jembatan", "siak"] },
  { asset: "kampung-bandar", name: "Kampung Bandar", categoryId: "budaya", tags: ["kampung", "senapelan"] },
  { asset: "kantor-wali-kota-pekanbaru-tenayan-raya", name: "Kantor Wali Kota Pekanbaru", categoryId: "lainnya", tags: ["pemerintah", "kantor"] },
  { asset: "kawasan-sungai-siak", name: "Kawasan Sungai Siak", categoryId: "alam", tags: ["sungai", "tepian"] },
  { asset: "kebun-binatang-kasang-kulim", name: "Kebun Binatang Kasang Kulim", categoryId: "rekreasi", tags: ["zoo", "kebun binatang"] },
  { asset: "living-world-pekanbaru", name: "Living World Pekanbaru", categoryId: "lainnya", tags: ["mal", "pusat perbelanjaan"] },
  { asset: "mal-ska", name: "Mal SKA Pekanbaru", categoryId: "lainnya", tags: ["mal", "ska"] },
  { asset: "mall-pekanbaru", name: "Mall Pekanbaru", categoryId: "lainnya", tags: ["mal", "pusat perbelanjaan"] },
  { asset: "masjid-raya-an-nur", name: "Masjid Raya An-Nur", categoryId: "budaya", tags: ["masjid agung an-nur", "masjid agung", "masjid"] },
  { asset: "masjid-senapelan", name: "Masjid Senapelan", categoryId: "budaya", tags: ["masjid", "senapelan"] },
  { asset: "museum-daerah-riau-sang-nila-utama", name: "Museum Sang Nila Utama", categoryId: "budaya", tags: ["museum daerah riau", "museum"] },
  { asset: "pasar-bawah", name: "Pasar Bawah", categoryId: "kuliner", tags: ["pasar", "senapelan"] },
  { asset: "pasar-cik-puan", name: "Pasar Cik Puan", categoryId: "kuliner", tags: ["pasar", "sukajadi"] },
  { asset: "perpustakaan-soeman-hs", name: "Perpustakaan Soeman HS", categoryId: "budaya", tags: ["perpustakaan soeman h.s.", "perpustakaan"] },
  { asset: "plaza-senapan", name: "Plaza Senapelan", categoryId: "lainnya", tags: ["plaza", "senapelan"] },
  { asset: "rainbow-hills", name: "Rainbow Hills", categoryId: "alam", tags: ["bukit", "rumbai"] },
  { asset: "rumah-singgah-tuan-kadi", name: "Rumah Singgah Tuan Kadi", categoryId: "budaya", tags: ["rumah adat", "tuan kadi"] },
  { asset: "taman-alam-mayang", name: "Taman Alam Mayang", categoryId: "rekreasi", tags: ["taman rekreasi"] },
  { asset: "taman-kaca-mayang", name: "Taman Kaca Mayang", categoryId: "rekreasi", tags: ["rth", "taman"] },
  { asset: "taman-labuai", name: "Taman Labuai", categoryId: "rekreasi", tags: ["taman", "labuai"] },
  { asset: "taman-wisata-okura", name: "Taman Wisata Okura", categoryId: "alam", tags: ["okura", "taman wisata"] },
  { asset: "transmart-pekanbaru", name: "Transmart Pekanbaru", categoryId: "lainnya", tags: ["transmart", "pusat perbelanjaan"] },
  { asset: "tugu-zapin", name: "Tugu Zapin", categoryId: "budaya", tags: ["tugu", "zapin"] },
];

export const STICKER_NAMES = new Set(STICKER_LANDMARKS.map((item) => item.asset));

export function stickerSrc(asset: string) {
  return `/assets/stickers/${asset}.png`;
}

/** Nama berkas yang belum punya entri di katalog (perlu verifikasi manual). */
export function unmatchedStickerFiles(files: string[]): string[] {
  return files.filter((file) => !STICKER_NAMES.has(file.replace(/\.png$/, "")));
}

/** Nama atlas yang tidak punya berkas stiker. */
export function atlasPlacesWithoutSticker(files: string[]): string[] {
  const present = new Set(files.map((file) => file.replace(/\.png$/, "")));
  return ATLAS_PLACES.filter((place) => !present.has(place.slug)).map((place) => place.slug);
}

/** Entri atlas untuk aset stiker, bila ada. */
export function atlasFor(asset: string) {
  return ATLAS_PLACES.find((place) => place.slug === asset) ?? null;
}
