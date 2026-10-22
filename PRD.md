# PRD Tapeta

**Nama produk:** Tapeta  
**Tagline:** Temukan tempat, bagikan cerita.  
**Versi dokumen:** 1.3 — cakupan nasional dengan deteksi lokasi  
**Status:** Prototipe MVP Phase 1–2  
**Cakupan:** Seluruh Indonesia untuk pemetaan wilayah; katalog destinasi contoh masih Pekanbaru

## Ringkasan

Tapeta adalah peta eksplorasi kota yang membantu orang menemukan tempat, memahami kecamatan, dan melihat sejauh mana suatu wilayah sudah dijelajahi. Peta menjadi antarmuka utama, bukan pelengkap.

## Masalah

Informasi tempat di banyak kota Indonesia tersebar di banyak kanal dan jarang terhubung dengan batas wilayah administratif. Orang sulit menjawab pertanyaan sederhana: tempat apa yang ada di kecamatan ini, dan kecamatan mana yang masih perlu dijelajahi? Kebutuhan yang sama berlaku di kota mana pun, bukan hanya di Pekanbaru.

## Pengguna

- **Penjelajah:** warga, pendatang, atau pelancong yang ingin menemukan tempat dan melihat sebaran wilayah.
- **Kontributor:** orang yang mengusulkan destinasi baru. Alur ini belum dibangun pada prototipe.
- **Admin:** pihak yang memverifikasi data. Alur ini belum dibangun pada prototipe.

## Prinsip Produk

1. Peta lebih dulu; daftar dan detail mendukung peta.
2. Batas kecamatan adalah unit status eksplorasi.
3. Hanya destinasi terbit dan terverifikasi yang dihitung.
4. Tidak menampilkan klaim palsu: foto, jam buka, jarak tempuh, atau popularitas harus punya sumber.
5. Data OpenStreetMap wajib mencantumkan atribusi dan lisensi.
6. Bahasa antarmuka: Indonesia.

## Ruang Lingkup MVP Phase 1–2

1. **Peta interaktif** berbasis Leaflet dan tile OpenStreetMap.
2. **Deteksi kota dari lokasi** lewat Nominatim saat izin lokasi sudah diberikan, plus **pencarian kota/kabupaten** manual.
3. **Batas kecamatan sesuai kebutuhan** (Overpass, admin level 6) untuk kota yang dipilih, dengan Pekanbaru memakai GeoJSON lokal.
4. **Katalog destinasi contoh** dari OpenStreetMap, tersimpan lokal (saat ini hanya Pekanbaru).
5. **Status eksplorasi per kecamatan** yang dihitung dari destinasi terbit di dalam poligon.
6. **Pencarian dan filter kategori** untuk daftar destinasi.
7. **Detail destinasi:** kategori, alamat, koordinat, jam buka bila terverifikasi, tautan OSM, dan jarak garis lurus dari lokasi pengguna.
8. **Detail kecamatan:** status, progres menuju ambang, daftar destinasi, dan tautan batas wilayah.
9. **Lokasi pengguna** dengan izin eksplisit dan penanda akurasi.
10. **Penyimpanan wilayah** di IndexedDB (90 hari) agar kunjungan berikutnya cepat.
11. **Responsif:** sidebar di desktop, bottom sheet di mobile.

## Aturan Status

| Jumlah destinasi terbit | Status |
| --- | --- |
| 0 | Belum dijelajah |
| 1–4 | Sedang dijelajah |
| >= 5 | Sudah dijelajah |

- Ambang disimpan di `src/data/categories.ts` sebagai `EXPLORATION_THRESHOLD`.
- Hanya destinasi berstatus `published` yang dihitung.
- Wilayah destinasi ditentukan dengan uji titik-dalam-poligon terhadap batas kecamatan. `regionCode` pada data adalah metadata pendukung, bukan sumber tunggal.
- Status tidak boleh dihitung dari destinasi yang belum terverifikasi.

## Model Data Minimum

**Destinasi:** `id`, `name`, `categoryId`, `description`, `address`, `regionCode`, `lat`, `lon`, `openingHours`, `publicationStatus`, `source`, `updatedAt`.

**Wilayah:** `properties.id`, `name`, `code`, `region_type`, `source`, `source_url`, `license`, serta geometri `Polygon` atau `MultiPolygon`.

**Koordinat:** urutan GeoJSON `[longitude, latitude]`; koordinat destinasi disimpan terpisah sebagai `lat` dan `lon`.

## Verifikasi dan Publikasi

- Destinasi publik harus melewati verifikasi admin sebelum berstatus `published`.
- Prototipe ini memakai data contoh OpenStreetMap yang **belum** diverifikasi admin.
- Catatan prototipe wajib terlihat di antarmuka dan tidak boleh disamarkan.

## Di Luar Lingkup Prototipe

- Autentikasi dan peran pengguna.
- Formulir usulan destinasi dan alur moderasi.
- Unggah foto, ulasan, rating, dan fitur sosial.
- Rute perjalanan, estimasi waktu tempuh, dan lalu lintas.
- Basis data produksi, PostGIS, serta API backend.
- Klaim "buka sekarang" tanpa sumber jam buka yang valid.

## Kebutuhan Non-Fungsional

- Mobile-first pada layar kecil; peta tetap menjadi fokus.
- Navigasi keyboard, label aksesibel, dan kontras teks yang memadai.
- Tidak memakai pola gelap atau dekoratif yang mengaburkan status wilayah.
- Menghormati kebijakan Nominatim dan tile OpenStreetMap, termasuk `User-Agent` dan pembatasan laju (maksimal satu permintaan per ~1,1 detik).
- Permintaan batas wilayah ke Overpass API publik harus punya percobaan ulang dan fallback endpoint.
- Build harus lolos `npm run build` dan `npm run lint`.

## Ukuran Keberhasilan

- Pengguna dapat menemukan satu destinasi dalam waktu singkat lewat pencarian atau peta.
- Status kecamatan dapat dipahami tanpa membuka detail.
- Tidak ada data contoh yang tampil seolah-olah sudah diverifikasi.
- Antarmuka tetap dapat digunakan pada layar 390 px.

## Risiko dan Batasan

- Akurasi dan kelengkapan data OpenStreetMap bervariasi; batas kecamatan bisa belum lengkap di sebagian kabupaten.
- Label kecamatan dapat bertumpuk pada zoom rendah.
- Sebaran destinasi contoh belum merata; tiga kecamatan di Pekanbaru masih tanpa destinasi.
- Overpass API publik bisa lambat atau menolak permintaan saat penuh; kunjungan pertama ke kota baru bisa memakan beberapa menit sebelum tersimpan di peramban.
- Di luar Pekanbaru, katalog destinasi sengaja kosong sampai ada data terverifikasi; ini bukan kerusakan data.
