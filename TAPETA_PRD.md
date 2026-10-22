# TAPETA — Product Requirements Document

**Nama:** TAPETA  
**Tagline:** Temukan tempat, bagikan cerita.  
**Versi:** 1.0 — dokumen kanonis  
**Tanggal:** 20 Oktober 2026  
**Status:** Baseline produk untuk desain, data/API, dan arsitektur. Keputusan yang belum ditetapkan ditandai **Terbuka**.

> Dokumen ini menjadi sumber kebenaran bersama untuk seluruh workstream TAPETA (PRD, UI/UX, Figma, skema/API, peta, dan implementasi). Percakapan proyek yang lebih lama adalah konteks historis; jika berbeda dengan dokumen ini, gunakan keputusan di sini. File di `sources/` adalah referensi baca-saja dan tidak boleh diubah.

## 1. Ringkasan eksekutif

TAPETA adalah platform web peta destinasi dan kontribusi komunitas untuk menemukan kafe, tempat wisata, dan tempat menarik di Indonesia. Produk diluncurkan dengan data dan ilustrasi kota Pekanbaru, tetapi arsitektur, navigasi, merek, dan peta sejak awal harus siap digunakan di seluruh Indonesia. Kota yang belum memiliki ilustrasi khusus tetap dapat dijelajahi memakai peta OSM netral/abu-abu. Data usulan baru tidak langsung menjadi konten publik: semua kontribusi melewati verifikasi admin.

Pengalaman dibuka dengan miniatur ilustratif seluruh Indonesia bergaya paper-cut/layered paper yang bergerak halus. Setelah interaksi, tampilkan “Ayo Jelajah!” sebelum masuk ke Explore. Miniatur ini merupakan karya editorial untuk intro, bukan peta geografis atau indikator kesiapan kota. Explore adalah peta OSM yang akurat, menggunakan koordinat nyata dan data destinasi yang diverifikasi. Inspirasi visual dapat diambil dari pendekatan peta paper pada Japan Trip Planners, tanpa menyalin komposisi, ilustrasi, aset, atau pola khasnya.

## 2. Visi, masalah, dan nilai

### Visi

Membuat tempat-tempat bermakna di seluruh Indonesia lebih mudah ditemukan melalui peta yang tumbuh dari pengetahuan lokal dan tetap dapat dipercaya.

### Masalah pengguna

- Informasi destinasi lokal terpencar dan tidak selalu mudah ditemukan secara geografis.
- Kota dan wilayah di luar pusat perhatian sering tidak memiliki kurasi yang mudah dijelajahi.
- Informasi kontribusi komunitas perlu ditinjau agar lokasi, kategori, dan bukti tidak menyesatkan.
- Data tempat yang terstruktur dan berkualitas dapat menjadi fondasi perencanaan perjalanan di masa depan.

### Nilai yang diberikan

- Penjelajah menemukan tempat melalui peta, kategori, dan pencarian.
- Warga lokal dapat mengusulkan destinasi di kota mana pun.
- Pengunjung paham tingkat ketersediaan data: area abu-abu berarti data TAPETA belum tersedia, bukan tidak ada destinasi.
- Admin mengendalikan mutu dan publikasi.

## 3. Tujuan, non-tujuan, dan metrik

### Tujuan MVP

1. Menjelajahi destinasi Pekanbaru pada peta OSM dan menyiapkan eksplorasi netral untuk wilayah Indonesia lainnya.
2. Menemukan tempat lewat pencarian, kategori, status wilayah, peta, dan daftar yang setara.
3. Mengajukan tempat dengan titik koordinat, informasi minimum, dan bukti foto; melacak hasil moderasi.
4. Memoderasi usulan dengan riwayat keputusan yang dapat diaudit.
5. Menyediakan model data yang dapat berkembang menjadi planner perjalanan.

### Bukan tujuan MVP

Pemesanan atau pembayaran, ulasan/rating kompleks, feed sosial penuh, pesan langsung, itinerary otomatis, dan jaminan informasi traffic real-time. Rute atau jarak hanya disediakan jika provider dan lisensinya sudah dipilih; jika belum, gunakan tautan ke navigasi eksternal atau tidak tampilkan.

### Metrik awal

- Pengguna yang berhasil menemukan detail destinasi dari Explore.
- Tingkat penyelesaian pencarian/filter dan alur pengajuan di desktop/mobile.
- Persentase usulan lengkap dan keputusan per status.
- Median waktu tunggu moderasi serta jumlah usulan tertunda.
- Jumlah kota/wilayah dengan setidaknya satu destinasi terverifikasi.
- Rasio koreksi, duplikasi, dan laporan pada destinasi publik.

## 4. Strategi cakupan nasional

- **Produk nasional sejak hari pertama:** struktur data mencakup provinsi, kota/kabupaten, kecamatan bila tersedia; pemilihan lokasi dan kontribusi tidak dibatasi Pekanbaru.
- **Peluncuran konten bertahap:** Pekanbaru adalah kota awal dengan ilustrasi kota khusus dan data awal yang dikurasi.
- **Kota lain dapat dijelajahi sebelum ilustrasi:** tampilkan peta OSM netral, batas wilayah, label, dan status cakupan. Jangan menyiratkan kota telah dikurasi.
- **Ilustrasi kota adalah keputusan editorial/operasional:** pertimbangkan cakupan destinasi terverifikasi, aktivitas dan kualitas kontribusi komunitas, potensi kota, kelayakan artistik, dan kapasitas tim. Satu kontribusi tidak otomatis memicu pembuatan ilustrasi.
- **Candidate data:** daftar destinasi awal yang belum diverifikasi harus diberi label internal “Kandidat — perlu verifikasi”. Kandidat tidak ditampilkan sebagai destinasi publik terverifikasi, dan koordinat/nama/alamat tidak boleh ditebak atau diklaim sebagai fakta.
- **Status coverage:** dihitung dari data publik terverifikasi dan/atau status paket ilustrasi, bukan dari kesan visual saja.

## 5. Merek dan prinsip pengalaman

- **Nama:** TAPETA. **Tagline:** “Temukan tempat, bagikan cerita.”
- Ramah, eksploratif, lokal, inklusif, dan dapat dipercaya.
- Visual paper-cut/layered paper adalah bahasa visual; peta operasional tetap terbaca dan akurat.
- Ambil inspirasi tingkat tinggi dari peta paper Japan Trip Planners (kedalaman lapisan, rasa buatan tangan, eksplorasi), tanpa menyalin desain, aset, copy, tata letak, atau identitasnya.
- Gunakan warna dan ikon selain warna untuk menyampaikan status; sediakan legenda dan teks.
- Hindari menyamakan “belum ada data TAPETA” dengan “tidak ada tempat”, area tidak aman, atau belum layak dikunjungi.

## 6. Pengguna dan akses

| Peran | Kebutuhan | Hak utama |
|---|---|---|
| Pengunjung/penjelajah | Menemukan tempat dengan cepat | Baca Explore, cari/filter, buka detail, lihat Komunitas |
| Pengguna terdaftar | Menyimpan identitas dan kontribusi | Akses My TAPETA, badge/points, kirim dan lacak usulan |
| Kontributor | Mengusulkan tempat di mana pun | Buat/edit usulan miliknya sesuai status; melihat catatan moderator |
| Moderator/admin | Menjaga mutu data dan perilaku | Tinjau, minta revisi, setujui/tolak, kelola laporan dan katalog |

**Keputusan login:** membaca peta dan Komunitas tidak memerlukan login. Aksi kontribusi dimulai dari Komunitas atau CTA kontekstual di Explore. Login/daftar diminta sebelum pengiriman agar kepemilikan, status, anti-spam, dan poin konsisten. Kebijakan login final tetap ditandai terbuka untuk validasi produk.

## 7. IA dan navigasi

Navigasi utama harus tepat tiga menu:

1. **Explore** — peta, daftar, pemilihan wilayah, pencarian, filter, detail, serta CTA kontribusi kontekstual.
2. **My TAPETA** — profil, akun/pengaturan, preferensi, favorit/koleksi jika tersedia, riwayat kontribusi pribadi dan statusnya. Profil atau pengaturan akun bukan menu utama tersendiri.
3. **Komunitas** — kontributor, kontribusi/aktivitas yang dipublikasikan sesuai kebijakan, panduan, dan aksi “Tambah kontribusi”. Pengunjung dapat menjelajah halaman; personalisasi, poin, dan badge milik sendiri memerlukan login.

Area admin/moderasi terpisah, hanya untuk role berwenang dan bukan menu publik. “Tambah tempat” adalah aksi di dalam Komunitas dan dapat muncul kontekstual di Explore; jangan menambahkannya sebagai menu utama keempat.

## 8. Persyaratan fitur

### 8.1 Intro dan landing

- Pengalaman pertama menampilkan miniatur seluruh kepulauan Indonesia, bukan Pekanbaru saja. Susunan boleh disederhanakan secara artistik dan tidak boleh dipakai untuk navigasi atau klaim koordinat.
- Gaya paper-cut/layered paper dengan beberapa pulau, landmark dan kota kecil yang bergerak lembut. Pekanbaru dapat tampil sebagai satu detail setara.
- Interaksi ringan (misalnya sentuh/klik untuk menghidupkan detail); kemudian transisi ke teks **“Ayo Jelajah!”**, tagline, lalu landing/Explore atau pemilihan kota.
- Intro hanya diwajibkan pada kunjungan pertama, dapat dilewati kapan pun, tidak diulang otomatis pada kunjungan berikutnya, dan dapat diputar ulang dari My TAPETA/bantuan.
- Hormati `prefers-reduced-motion`; sediakan versi statis, keyboard, label aksesibel, dan fallback saat animasi/aset gagal.
- Muat aset bertahap dan jangan menahan akses Explore. Simpan status selesai secara lokal bila memungkinkan tanpa mengharuskan akun.

### 8.2 Explore dan peta

- Peta Explore menggunakan OSM sebagai basis peta geografis, bukan miniatur intro. Geometri, batas, pin, dan koordinat mewakili lokasi dunia nyata.
- Menampilkan Pekanbaru dengan paket ilustrasi paper-art khusus jika aset dan datanya telah disetujui. Kota tanpa paket khusus memakai tampilan OSM yang tenang/netral/abu-abu.
- Menyediakan zoom/pan, pemilih provinsi/kota, lokasi saya opsional, pin/cluster, legenda status, dan daftar hasil sebagai alternatif peta.
- Pengguna dapat beralih antara peta dan daftar tanpa kehilangan area, kueri, atau filter.
- Tampilkan batas administratif sesuai data yang tersedia dan kualitas/lisensi sumbernya; jangan mengarang batas.
- Atribusi OSM wajib terlihat menurut ketentuan penggunaan tile/data yang dipilih.

### 8.3 Destinasi dan detail

Kategori awal yang diusulkan: kafe, makanan/minuman, wisata alam, wisata budaya/sejarah, rekreasi/keluarga, ruang publik, dan lainnya. **Taksonomi final terbuka** dan harus dapat dikonfigurasi.

Detail memuat nama, kategori, titik pada peta mini, alamat/lokasi yang bersumber, foto yang berizin, jam buka bila terverifikasi, deskripsi/catatan, status verifikasi dan waktu pembaruan. Tampilkan “Belum tersedia” untuk nilai kosong; jangan mengisi informasi rekaan. Sediakan tombol rute hanya jika terintegrasi dengan provider yang disetujui.

### 8.4 Pencarian, filter, dan status wilayah

- Cari nama tempat, kota/kabupaten, kecamatan atau area; hasil menunjukkan konteks geografis.
- Filter kategori, wilayah, dan status ketersediaan; dukung hapus semua filter dan empty state.
- Status area minimum: **Belum ada data terverifikasi** (netral/abu-abu), **Mulai terisi** (ada sebagian destinasi terverifikasi), **Paket ilustrasi tersedia** (jika relevan). Status tidak boleh bergantung pada kontribusi yang masih menunggu.
- Gunakan legenda, label teks, dan kontras; warna bukan satu-satunya pembeda.
- Area kosong memberi pesan: “Belum ada tempat terverifikasi di area ini. Ini bukan berarti tidak ada tempat; data TAPETA belum tersedia.” CTA usul tempat dapat ditampilkan.

### 8.5 Kontribusi dan moderasi

Alur: Komunitas atau CTA Explore → login/daftar bila belum terautentikasi → pilih wilayah/titik di peta atau cari alamat → isi informasi → tinjau dan pernyataan kebenaran/izin → kirim → status **Menunggu verifikasi** → keputusan moderator.

Field usulan: nama, kategori, koordinat (latitude/longitude), wilayah turunan, bukti foto opsional/berdasarkan kebijakan, jam buka opsional, deskripsi/catatan dan sumber informasi. Sistem validasi format dan rentang koordinat; peta picker dapat menggeser pin. Izin lokasi perangkat tidak wajib. Data kandidat dari seed ditangani sebagai antrean internal yang sama, dengan status dan sumber.

Moderator dapat memeriksa lokasi, bukti, kelengkapan, kemungkinan duplikat, hak media, dan sumber; lalu **Setujui**, **Minta perbaikan**, atau **Tolak** dengan alasan. Hanya status disetujui yang menjadi destinasi publik, memengaruhi status wilayah, poin, badge, dan metrik coverage. Aksi dicatat dengan aktor dan waktu. Pengusul melihat status, alasan, dan dapat memperbarui bila diminta.

### 8.6 Komunitas, poin, dan badge

- Komunitas dapat dilihat tanpa login: daftar kontributor/kontribusi yang memang dipilih untuk tampil, aturan kontribusi, dan CTA.
- Pengguna terautentikasi melihat profil komunitas, poin, badge, serta riwayat kontribusi pribadi di My TAPETA.
- Poin diberikan untuk kontribusi yang disetujui, bukan sekadar jumlah pengajuan. Hindari insentif spam; batas/rumus dan badge awal **terbuka**.
- Beri pilihan nama tampilan/visibilitas publik dan sediakan pelaporan/moderasi konten.

### 8.7 My TAPETA dan autentikasi

My TAPETA mencakup ringkasan profil, pengaturan akun/privasi, kontribusi dan status moderasi, notifikasi status, badge/poin, serta favorit bila masuk ruang lingkup. Mendukung masuk/daftar, keluar, pemulihan akun, dan penghapusan akun/data sesuai kebijakan. Sediakan state login kadaluarsa dan kegagalan autentikasi.

## 9. Model data konseptual

Skema implementasi dapat berbeda, tetapi wajib mempertahankan konsep berikut:

- **User:** id, identitas autentikasi eksternal, display name, role, preferensi/consent, timestamps.
- **Region:** id, parent region, nama baku, tipe administrasi, kode sumber, geometri opsional dan provenance/lisensi.
- **Destination:** id, nama, kategori, latitude, longitude, region id, alamat/deskripsi opsional, jam buka terverifikasi, status publik, sumber, timestamps.
- **Submission:** id, submitter, payload kandidat, koordinat, region, status (`pending`, `needs_changes`, `approved`, `rejected`, `withdrawn`), versi, timestamps.
- **MediaAsset:** id, lokasi object storage, tipe/ukuran, checksum, pemilik, izin/lisensi, status moderasi, retensi.
- **ModerationDecision:** id, submission, moderator, aksi, alasan publik, catatan internal terpisah bila diperlukan, timestamp.
- **Category:** id, label, ikon, status aktif, parent opsional.
- **Coverage/IllustrationPackage:** region, status coverage, versi geometri/styling, aset dan lisensi, status publikasi, timestamps. Coverage harus diturunkan/ditinjau dari data terverifikasi, bukan kontribusi mentah.
- **ContributionLedger/Badge:** peristiwa poin yang dapat diaudit dan aturan/versi badge; cegah poin ganda saat status berubah.
- **SavedPlace (opsional MVP):** user, destination, created_at.
- **Report/AuditEvent:** laporan penyalahgunaan atau perubahan penting dengan akses terbatas.

Gunakan ID stabil, koordinat WGS84, validasi batas geografis, indeks geospasial, serta relasi eksplisit antara usulan dan destinasi hasil persetujuan. Pisahkan data pribadi dari data publik. Pertahankan provenance dan timestamp untuk fakta yang dapat berubah.

## 10. API outline

Gunakan API ber-versi dengan JSON, validasi server-side, autentikasi berbasis token/session dari penyedia managed, paginasi, rate limit, dan skema error konsisten.

| Endpoint konseptual | Akses | Fungsi |
|---|---|---|
| `GET /v1/regions?query=&parent=` | Publik | Cari/pilih wilayah |
| `GET /v1/coverage?region_id=` | Publik | Status coverage dan paket ilustrasi yang terbit |
| `GET /v1/destinations?bbox=&region_id=&category=&q=` | Publik | Cari destinasi terverifikasi dengan viewport/filter |
| `GET /v1/destinations/{id}` | Publik | Detail destinasi publik |
| `POST /v1/submissions` | Login | Buat usulan; response mengembalikan id/status |
| `GET /v1/me/submissions` | Login | Daftar kontribusi sendiri |
| `PATCH /v1/submissions/{id}` | Pemilik, status yang diizinkan | Revisi usulan |
| `POST /v1/media/upload-intent` | Login | Meminta URL upload sementara dan aturan validasi |
| `GET /v1/community/contributors` | Publik | Profil komunitas yang memilih tampil |
| `GET /v1/me/profile`, `PATCH /v1/me/profile` | Login | Baca/ubah profil sendiri |
| `GET /v1/me/points`, `GET /v1/me/badges` | Login | Ringkasan poin dan badge |
| `GET /v1/admin/submissions` | Admin | Antrean dan filter moderasi |
| `POST /v1/admin/submissions/{id}/decision` | Admin | Setujui, minta revisi, atau tolak; alasan wajib untuk revisi/tolak |

Endpoint publik hanya mengembalikan data yang disetujui. Admin API memeriksa role di sisi server/database. Jangan percaya koordinat/status/role yang dikirim klien. Operasi keputusan harus idempotent atau terlindung dari submit ganda.

## 11. Arsitektur teknis tingkat tinggi

- **Klien:** aplikasi web responsif/PWA opsional; komponen peta, daftar yang aksesibel, cache ringan, dan kontrol privasi.
- **Peta:** library klien yang kompatibel dengan OSM; pilih provider tile/geocoding/routing terpisah berdasarkan lisensi, kapasitas, atribusi, biaya, dan batas penggunaan. OSM tidak berarti semua layanan gratis tanpa batas.
- **Backend tanpa server yang dikelola sendiri:** gunakan platform managed berbasis layanan terkelola (database Postgres/PostGIS sebagai pilihan, auth, object storage, serverless functions/API gateway, logging/monitoring, backup). Hindari mengoperasikan VM/server dan tile server sendiri pada MVP.
- **Keamanan data:** aturan akses least-privilege/RLS, endpoint admin terpisah, secrets hanya di server-side, signed upload URL, validasi file, sanitasi, rate limit dan audit log.
- **Media:** simpan foto di object storage/CDN, bukan di database; buat thumbnail/varian terkompresi, batasi ukuran/dimensi, hapus metadata EXIF lokasi bila tidak dibutuhkan, lazy-load dan gunakan format modern.
- **Data geografis:** koordinat dan geometri disimpan terstruktur; pencarian bbox dan indeks geospasial. Jangan memakai gambar ilustrasi untuk menghitung jarak/posisi.
- **Ketersediaan:** cache data publik yang tidak sensitif, paginasi/viewport query, backup otomatis dan ekspor data berkala yang dapat dipulihkan. Tetapkan batas biaya dan alarm sebelum skala meningkat.
- **Provider/stack spesifik:** **Terbuka** sampai evaluasi biaya, data residency/kebijakan, lisensi peta, batas paket gratis, dan kebutuhan operasional dilakukan. Jangan menganggap vendor tertentu sudah dipilih.

## 12. Hak media, penyimpanan, dan atribusi

- Foto kontribusi harus diunggah oleh pemilik atau memiliki izin yang memadai; syarat kontribusi meminta hak penggunaan yang jelas dan dapat dicabut sesuai kebijakan.
- Jangan menyalin ilustrasi, foto, ikon, atau kode Japan Trip Planners. Buat ilustrasi TAPETA dari awal atau gunakan aset dengan lisensi yang terdokumentasi.
- Catat sumber, lisensi, atribusi, pembuat, dan wilayah/versi untuk setiap paket peta/ilustrasi dan data wilayah.
- Kompres foto, simpan hanya ukuran yang dibutuhkan, buat thumbnail, deduplikasi checksum bila cocok, atur batas unggah dan retensi untuk konten yang ditolak/dihapus.
- Pertahankan atribusi OSM dan ketentuan provider tile/geocoding/routing di antarmuka yang sesuai.

## 13. Aksesibilitas, kinerja, privasi, dan keamanan

### Aksesibilitas

Target WCAG 2.2 AA sebagai sasaran desain/implementasi: navigasi keyboard, fokus jelas, kontras, label screen reader, reduced motion, ukuran target sentuh, bahasa sederhana, dan daftar hasil setara untuk peta. Peta tidak boleh menjadi satu-satunya cara menemukan konten.

### Kinerja

Prioritaskan konten dan kontrol Explore; lazy-load peta/ilustrasi/foto, kompres aset, gunakan cluster dan query berdasarkan viewport, batasi payload, dan tampilkan fallback bila peta gagal. Target awal Core Web Vitals dan waktu respons ditetapkan setelah baseline perangkat/jaringan Indonesia dikumpulkan.

### Privasi

Lokasi perangkat opsional dan hanya diminta saat diperlukan dengan penjelasan. Jangan simpan riwayat lokasi pengguna secara default. Minimalkan data akun, tampilkan pilihan visibilitas komunitas, pisahkan catatan moderator, jelaskan retensi dan proses hapus akun.

### Keamanan dan penyalahgunaan

Gunakan managed auth, verifikasi izin server-side, perlindungan CSRF/XSS sesuai pola aplikasi, validasi unggahan, throttling/anti-spam, log keputusan, serta mekanisme laporan dan koreksi destinasi. Jangan mengekspos data kontak pribadi atau catatan internal.

## 14. Acceptance criteria

1. Intro menunjukkan miniatur seluruh Indonesia, bukan Pekanbaru saja, lalu “Ayo Jelajah!” muncul sebelum masuk ke landing/Explore.
2. Intro dapat dilewati, dimainkan ulang atas pilihan pengguna, memiliki versi reduced-motion/statis, dan tidak menghalangi akses saat aset/animasi gagal.
3. Produk membedakan secara eksplisit miniatur intro yang artistik dari Explore OSM yang akurat.
4. Pengguna dapat memilih dan menjelajahi wilayah di Indonesia; kota tanpa ilustrasi khusus tetap memiliki pengalaman OSM netral.
5. Pin destinasi publik berasal dari koordinat yang tersimpan dan berstatus disetujui; tidak ada lokasi/venue yang direka sebagai fakta.
6. Seed yang belum diperiksa tampil hanya di ruang kerja/antrean internal berlabel kandidat perlu verifikasi.
7. Pencarian/filter tersedia bersama daftar hasil; pengguna dapat memahami area kosong sebagai kekurangan data TAPETA.
8. Pengajuan dapat dilakukan tanpa izin lokasi perangkat, memiliki status, dan tidak tampil publik sebelum disetujui admin.
9. Admin dapat meninjau bukti dan lokasi, mendeteksi calon duplikat, memberi keputusan beserta alasan, dan keputusan terekam.
10. Navigasi utama persis Explore, My TAPETA, Komunitas; pengaturan akun ada di My TAPETA; kontribusi ada di Komunitas dan bisa muncul kontekstual di Explore.
11. Komunitas dapat dibaca sebagai tamu; poin/badge personal dan My TAPETA memerlukan autentikasi.
12. UI responsif, menyediakan state loading/error/offline/kosong/izin ditolak, serta alternatif peta yang dapat diakses.
13. Atribusi peta dan media ditampilkan; foto yang tidak memiliki hak/persetujuan tidak dipublikasikan.
14. Kontrol akses mencegah pengguna mengubah status moderasi atau melihat data privat pengguna lain.

## 15. Roadmap berfase

| Fase | Fokus | Hasil |
|---|---|---|
| 0. Fondasi | Validasi kategori, wilayah/data, provider peta, aturan media dan login | keputusan teknis/operasional, content model, kriteria ilustrasi |
| 1. MVP Pekanbaru | Intro nasional, Explore OSM, kota ilustrasi Pekanbaru, destinasi terverifikasi, pencarian/filter, komunitas, login, kontribusi, moderasi | web responsif siap pilot |
| 2. Pilot komunitas | Uji alur kontribusi, moderasi, badge sederhana, koreksi/laporan, analitik | mutu data dan kapasitas moderasi terukur |
| 3. Perluasan nasional netral | Pemilihan dan peta netral untuk semua wilayah, pipeline kandidat, pengelolaan coverage | eksplorasi nasional sebelum ilustrasi kota baru |
| 4. Ilustrasi kota bertahap | Prioritaskan kota dari coverage, aktivitas, potensi, dan kapasitas | paket ilustrasi terkurasi per kota |
| 5. Perencana perjalanan | Koleksi/rute multi-tempat, jarak/provider setelah validasi | planner berdasarkan data terverifikasi |

Urutan dan tanggal tiap fase **terbuka** sampai kapasitas tim dan target pilot disepakati.

## 16. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Kontribusi salah, duplikat, atau spam | moderasi wajib, bukti/sumber, rate limit, duplikasi, laporan dan audit |
| Pengguna menafsirkan abu-abu sebagai tidak ada destinasi | legenda dan copy konsisten; sebut “data TAPETA belum tersedia” |
| Intro dianggap menandakan semua kota sudah siap | tegaskan intro editorial terpisah; status aktual hanya dari coverage Explore |
| Pembuatan ilustrasi melampaui kapasitas | prioritas bertahap dengan kriteria coverage, aktivitas, potensi, kapasitas; bukan otomatis |
| Ketergantungan tile/geocoding/routing dan biaya | evaluasi lisensi/kuota, cache sesuai ketentuan, vendor fallback dan alarm biaya |
| Hak foto/ilustrasi tidak jelas | rekam lisensi/izin, proses takedown, aset orisinal dan kompresi |
| Poin mendorong kuantitas rendah mutu | hanya beri poin setelah persetujuan, aturan transparan dan anti-abuse |
| Data seed tidak akurat | label kandidat internal, verifikasi sebelum publikasi, simpan provenance |
| Ketergantungan pada server self-managed | gunakan komponen managed/serverless, backup dan ekspor teruji |

## 17. Keputusan terbuka

1. Provider managed backend, database, auth, storage, hosting, tile, geocoding, dan routing; biaya dan batas pemakaian.
2. Taksonomi kategori MVP dan aturan kategori “lainnya”.
3. Apakah foto wajib atau opsional saat pengajuan, batas ukuran/format, izin, dan retensi.
4. Persyaratan kelengkapan minimum untuk jam buka, alamat, deskripsi, dan sumber.
5. Data batas administratif Indonesia yang dipakai dan lisensinya.
6. Login wajib sebelum mulai mengisi atau hanya sebelum mengirim; metode login yang didukung.
7. Jumlah poin/badge, visibilitas nama kontributor, dan aturan anti-abuse.
8. SLA moderasi, jumlah moderator, proses banding, dan kebijakan catatan internal.
9. Kriteria kuantitatif pemilihan kota berikutnya untuk ilustrasi paper-art.
10. Apakah favorit/koleksi termasuk MVP atau fase berikutnya.
11. Baseline sasaran kinerja, dukungan browser/perangkat, serta target ketersediaan.
12. Kebijakan privasi, penghapusan akun, dan retensi sesuai yurisdiksi operasi.

## 18. Arahan untuk semua workstream

- **UI/Figma:** tiga menu utama; intro miniatur Indonesia; “Ayo Jelajah!”; pisahkan ilustrasi intro dari OSM; Pekanbaru awal, kota lain netral; buat guest/auth state dan semua empty/error/moderation states.
- **Schema/API:** koordinat geografis nyata, hierarki wilayah, status usulan dan keputusan admin, provenance media/data, coverage/paket ilustrasi terpisah; hanya approved yang publik.
- **Map architecture:** OSM untuk Explore; ilustrasi tidak pernah menjadi sumber koordinat; provider dan lisensi harus diputuskan; dukung area nasional tanpa paket ilustrasi.
- **Konten/data:** tidak mengarang destinasi/koordinat. Tandai kandidat sampai verifikasi; publikasi dan coverage hanya berdasarkan data yang lolos moderasi.
- **Jika keputusan baru disetujui:** revisi dokumen kanonis ini dahulu, catat tanggal/perubahan, lalu sinkronkan spesifikasi turunan.
