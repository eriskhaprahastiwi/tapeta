# TAPETA — Product & Technical Requirements for OpenCode

**Versi:** 2.0 — spesifikasi implementasi berdasarkan keputusan terbaru di percakapan TAPETA dan desain `TAPETA.pen`  
**Tanggal:** 21 Oktober 2026  
**Status:** Dokumen implementasi kanonis untuk OpenCode  
**Bahasa produk:** Indonesia  
**Tagline:** *Temukan tempat, bagikan cerita.*

> Gunakan dokumen ini sebagai sumber kebenaran saat mengubah aplikasi. Permintaan terbaru pengguna dan desain terbaru di `TAPETA.pen` mengungguli dokumentasi lama bila ada konflik. Pertahankan aset lokal dan perilaku yang sudah benar. Jangan menghapus atau mengganti `.pen`, ekspor desain, aset ilustrasi, atau sumber data tanpa alasan teknis yang jelas. Jangan membuat klaim bahwa backend, login, data, verifikasi, atau koordinat sudah nyata sebelum benar-benar terhubung dan diuji.

## 1. Ringkasan produk

TAPETA adalah peta eksplorasi Indonesia yang menampilkan destinasi sebagai **stiker ilustrasi di koordinat geografis sebenarnya**. Explore menggunakan OpenStreetMap (OSM) sebagai sumber posisi, batas wilayah dan navigasi peta. Pekanbaru menjadi kota pertama dengan ilustrasi cat air yang mengikuti bentuk dan koordinat batas kota/kecamatan. Kota lain tetap bisa dibuka dengan peta OSM netral; ilustrasi khusus baru muncul setelah paket ilustrasi wilayah tersebut tersedia dan diterbitkan.

Produk memiliki tiga menu utama: **Explore**, **My TAPETA**, dan **Komunitas**. Ada juga intro/landing, detail destinasi, formulir kontribusi, dashboard pengguna, dashboard admin, antrean moderasi, halaman kota yang belum memiliki ilustrasi, notifikasi, dan halaman status sistem. Seluruh pengalaman harus berfungsi di desktop dan mobile; mobile menggunakan komposisi dan hierarki informasi yang sama, disusun ulang untuk layar kecil.

### Tujuan

1. Menemukan tempat dari peta, pencarian, kategori, daftar dan stiker destinasi.
2. Menampilkan peta Indonesia sebagai ilustrasi cat air yang utuh pada landing, lalu menyediakan peta OSM yang akurat di Explore.
3. Membuat peta cat air Pekanbaru menyatu dengan OSM, mengikuti pan/zoom, serta tidak terlihat sebagai gambar persegi yang menutupi kota lain.
4. Membuat kontribusi komunitas dapat ditinjau dan hanya diterbitkan setelah verifikasi admin.
5. Menyediakan backend nyata untuk akun, role admin, destinasi, moderasi, notifikasi, media, dan rekap data.
6. Menyiapkan kota Indonesia lain agar dapat dieksplorasi sebelum tersedia ilustrasi khusus.

### Bukan tujuan MVP

Pemesanan, pembayaran, chat langsung, ulasan bintang, navigasi turn-by-turn, estimasi lalu lintas real-time, serta pembuatan ilustrasi kota otomatis. Jangan mengarang informasi tempat, jam buka, foto, lisensi, statistik, atau status verifikasi.

## 2. Sumber kebenaran dan implementasi saat ini

- Desain visual acuan: `TAPETA.pen`; ekspor HTML terbaru: `TAPETA-pen-export.html`.
- Aset logo, ilustrasi, stiker dan peta: gunakan aset yang sudah ada di `public/assets/` dan `tapeta-stickers/` bila lisensinya sesuai.
- Kode aktif: React, TypeScript, Vite, Leaflet. Peta operasional sudah memakai OSM.
- `src/lib/session.ts` dan `src/lib/submissions.ts` saat ini memakai `localStorage`; itu hanya prototipe, bukan autentikasi/backend produksi. Dashboard admin lokal tidak boleh dianggap aman.
- Data contoh Pekanbaru di kode/seed adalah data kandidat/prototipe sampai sumber dan status verifikasinya diperiksa. Jangan otomatis memublikasikan data tersebut.
- Catatan sumber, lisensi, tanggal ekstraksi, dan verifikasi harus menyertai data OSM maupun batas wilayah.

### Prioritas bila dokumen bertentangan

1. Instruksi eksplisit terbaru pengguna.
2. Desain terbaru di `TAPETA.pen` dan persyaratan dokumen ini.
3. PRD lama, `DESIGN.md`, `PRODUCT.md`, README, lalu perilaku prototipe.

Dokumentasikan konflik penting dalam PR sebelum memilih perilaku. Jangan menyalin desain, ilustrasi, foto, atau merek Japan Trip Planners; gunakan hanya sebagai inspirasi tingkat tinggi untuk rasa eksplorasi dan kedalaman visual.

## 3. Peran, akses, dan navigasi

| Peran | Akses |
|---|---|
| Pengunjung | Melihat landing, Explore, kota, detail, Komunitas dan atribusi tanpa akun. |
| Pengguna terdaftar/kontributor | Mengelola profil sendiri, mengirim kontribusi, melihat status, notifikasi, poin dan lencana miliknya. |
| Moderator/admin | Meninjau usulan, meminta perbaikan, menyetujui/menolak, mengelola laporan, melihat rekap dan riwayat audit. Hak diberikan oleh backend. |

Navigasi utama harus tepat tiga menu: **Explore**, **My TAPETA**, **Komunitas**. Menu akun, profil, notifikasi dan keluar ditempatkan pada bagian atas halaman terkait. Admin dashboard bukan menu publik dan hanya dapat dibuka oleh role admin yang diperiksa di server/database. Jangan menampilkan tautan admin kepada akun biasa.

Di mobile, navigasi utama berada di bagian atas seperti desain Pen, tetap mudah dijangkau, dan tidak boleh menimpa judul/konten. Dashboard pengguna/admin memiliki ikon notifikasi di header atas; dashboard admin juga memiliki kontrol profil dan keluar berbasis ikon. Jangan membuat menu kecamatan wajib sebagai tab mobile; kecamatan tetap dapat dipilih melalui peta, pencarian atau filter kontekstual.

## 4. Peta, wilayah dan stiker

### 4.1 Peta Explore

- Leaflet + OSM adalah referensi geografis operasional. Koordinat marker, batas, pan/zoom, titik pilihan dan lokasi pengguna harus berasal dari geometri/koordinat nyata.
- Stiker merupakan visual dekoratif untuk destinasi yang sama koordinatnya dengan marker OSM. Setiap stiker menyimpan `destination_id`, latitude, longitude, versi aset, sumber/lisensi, dan alt text. Perubahan zoom/pan tidak boleh menggeser stiker dari lokasi geografisnya.
- Pada zoom rendah, stiker dapat berubah menjadi marker ringkas/cluster agar peta tidak bertumpuk. Saat zoom cukup, stiker ditampilkan dengan ukuran layar yang konsisten. Hindari benturan teks; label dapat muncul saat hover/fokus/klik.
- Klik stiker/marker membuka detail tempat dan menyorot titiknya. Klik baris daftar atau kartu pilihan lokasi memfokuskan peta ke koordinat yang sama. Kontrol tutup kembali ke peta tanpa kehilangan query/filter.
- Peta menyediakan zoom, pan, reset ke area, lokasi saya (opsional dan hanya setelah izin), skala, legenda status, dan atribusi OSM yang terbaca.
- Peta gagal memuat tile: tampilkan pesan yang membantu, tetapi pencarian, daftar, detail dan kontribusi tetap dapat digunakan.

### 4.2 Peta cat air Pekanbaru

- Gunakan `public/assets/map/pekanbaru-watercolor-v2.png` sebagai ilustrasi kota jika kalibrasi dan hak aset masih berlaku.
- Overlay harus terikat ke bounds geografis dan mengikuti pan/zoom Leaflet. Potong/mask bagian luar berdasarkan geometri batas administrasi Pekanbaru yang sumbernya tercatat. Jangan menampilkan bidang kertas persegi opak di luar wilayah, jangan menutupi kota/area tetangga, dan jangan menyebut ilustrasi sebagai peta navigasi.
- Batas kecamatan OSM harus tetap terbaca di atas ilustrasi; stiker destinasi dan marker interaktif harus berada di lapisan atas. Mask harus tetap benar saat zoom dan ukuran viewport berubah.
- Tepi ilustrasi diberi transisi cat air lembut yang mengikuti bentuk daratan; hindari garis tebal bergerigi, bentuk pulau buatan yang tidak cocok dengan OSM, dan efek kabur berlebihan. Wilayah di luar Pekanbaru menampilkan OSM dasar.
- Koordinat hasil kalibrasi aset bersifat perkiraan visual. Jangan mengklaim ilustrasi sebagai batas survei atau sumber koordinat. Validasi keselarasan pada beberapa zoom dan titik kontrol sebelum rilis.

### 4.3 Wilayah yang belum dieksplorasi

- Kota/kabupaten selain Pekanbaru tetap mempunyai halaman Explore: pilih wilayah, muat batas OSM bila tersedia, tampilkan area netral, pencarian, status cakupan, empty state dan ajakan kontribusi.
- Arti warna abu-abu: **data TAPETA belum tersedia**, bukan berarti tidak ada tempat. Gunakan teks eksplisit dan legenda; warna tidak menjadi satu-satunya penanda status.
- Jangan mengarang destinasi untuk mengisi peta kosong. Kota tanpa stiker tetap terlihat utuh melalui OSM dan batas wilayah yang tersedia.
- Kota baru tidak otomatis mendapatkan ilustrasi. Paket ilustrasi dipublikasikan melalui proses admin/editorial.

### 4.4 Status eksplorasi

Untuk MVP gunakan aturan yang konsisten dari jumlah destinasi yang **terbit dan terverifikasi** per kecamatan:

| Jumlah destinasi terbit | Status UI | Tampilan |
|---:|---|---|
| 0 | Belum dijelajahi / belum ada data TAPETA | netral, abu-abu/kertas |
| 1–4 | Sedang dijelajahi | krem/oker lembut |
| 5+ | Sudah dijelajahi | hijau lembut |

Angka ambang wajib berada di konfigurasi domain/backend agar mudah diubah. Usulan pending/rejected tidak dihitung. Jika boundaries tidak tersedia, jangan menampilkan status kecamatan rekaan; berikan status coverage “batas wilayah belum tersedia”.

## 5. Landing dan intro

### Desktop dan mobile

- Mobile adalah adaptasi layout web, bukan desain produk terpisah. Cerita, CTA, warna, jenis peta dan identitas sama. Susun ulang vertikal untuk layar kecil tanpa memotong pulau.
- Layar intro memperlihatkan **seluruh Nusantara** mengambang di atas bidang laut cat air satu layar. Laut menggunakan gradasi aquarel yang terang (aqua/biru muda lembut ke krem), bukan latar biru tua solid. Daratan memiliki gradasi unik yang hangat (pasir, hijau sage, terracotta) dan tekstur cat air agar tidak monoton.
- Hindari bingkai/persegi yang memisahkan gambar peta dari laut. Peta harus tampak menyatu dengan latar; seluruh pulau dari Sumatra sampai Papua harus terlihat pada desktop/mobile.
- Tampilkan CTA utama **“Ayo Jelajah!”** sebagai fokus paling jelas di bagian atas hero. Tidak boleh ada nomor urut seperti 02/04 atau intro berulang yang mengganggu.
- Ilustrasi landasan bersifat editorial; jangan gunakan untuk mengukur jarak atau navigasi. Tampilkan pin/label Pekanbaru secara halus bila sesuai, tetapi **jangan menampilkan seluruh kota Pekanbaru sebagai satu stiker**.
- Tambahkan stiker landmark ikonik pada peta Nusantara. Setiap gugus pulau utama memiliki minimum dua landmark sampai Papua. Kandidat awal berikut adalah arahan konten, **bukan data terverifikasi**: Sumatra—Jam Gadang (Bukittinggi), Jembatan Ampera (Palembang); Jawa—Bundaran HI (Jakarta), Gedung Sate (Bandung), Borobudur, Tugu Jogja, Bromo dan Tugu Pahlawan (Surabaya); Kalimantan—Tugu Khatulistiwa dan Rumah Radakng (Pontianak); Sulawesi—Benteng Rotterdam dan Pantai Losari (Makassar), landmark Sulawesi Utara; Bali–Nusa Tenggara—Pura Ulun Danu Beratan (Bali), landmark Lombok/NTB; Maluku—Gong Perdamaian Dunia dan Benteng Oranje; Papua—Danau Sentani dan Jembatan Youtefa. Sebelum membuat atau menerbitkan stiker, OpenCode wajib memeriksa ejaan, lokasi, koordinat, sumber, lisensi dan kecocokan landmark untuk setiap provinsi/gugus. Pengguna pernah menyebut “tugu lele di Surabaya”; jangan menebak landmark yang dimaksud—gunakan kandidat sementara di atas dan tandai perlu konfirmasi/verifikasi. Setiap aset harus teridentifikasi, tidak menimpa teks/CTA, dan tetap terbaca di mobile.
- Ada tombol lewati intro, reduced-motion, dan akses masuk langsung ke Explore. Intro tidak boleh menghalangi penggunaan aplikasi.

## 6. Halaman dan perilaku utama

### 6.1 Landing/beranda

Urutan: header/logo + menu atas → hero “Ayo Jelajah!” dan tagline → ilustrasi peta Nusantara utuh → CTA Explore → penjelasan TAPETA singkat/ajakan kontribusi → footer dan atribusi seperlunya. Jangan menjadikan daftar kafe/resto sebagai isi utama landing; konten awal mengikuti daftar destinasi yang disetujui pengguna.

### 6.2 Explore desktop

Komposisi acuan: topbar, panel pencarian/filter/daftar di kiri, peta utama yang dominan, strip pilihan stiker/lokasi, dan panel detail yang muncul saat dipilih. Detail destinasi dapat menjadi panel kanan. **Jika detail terbuka dan panel daftar disembunyikan, kolom kiri harus hilang dari layout, bukan tetap menjadi bidang biru tua kosong.** Ini aturan khusus perbaikan bug pada screenshot pengguna; aturan ini tidak berarti semua komponen gelap harus dihapus.

Panel pencarian menampilkan lokasi aktif, jumlah data yang benar-benar dimuat, search, kategori, filter wilayah/status bila relevan, daftar hasil, empty state serta tombol usul tempat. Filter kecamatan boleh tersedia di desktop sebagai alat opsional, bukan menu wajib.

### 6.3 Explore mobile

Topbar/brand dan menu utama berada di atas. Search/filter di bawahnya, peta sebagai bagian terbesar viewport, lalu bottom sheet/daftar lokasi yang dapat digeser. Stiker mengikuti peta OSM dan tidak bertumpuk sembarang. Saat stiker ditekan, tampilkan detail mobile sesuai frame Pen: gambar/stiker, nama, lokasi, kategori, status verifikasi, koordinat/sumber, tombol fokus peta, rute hanya bila tersedia, dan tutup/kembali yang jelas. Hindari panel peta dalam bingkai kecil dengan ruang kosong di sekelilingnya.

### 6.4 Detail destinasi

Tampilkan hanya nilai yang ada dan tervalidasi: nama, kategori, alamat, kecamatan/kota, koordinat, sumber, tanggal pembaruan, jam buka bila terverifikasi, deskripsi, foto berizin, dan status moderasi. Foto kosong menggunakan placeholder editorial kertas yang lembut (bukan gambar rekaan). Aksi: fokuskan peta, buka rute provider yang sah (atau sembunyikan bila belum dikonfigurasi), bagikan tautan, laporkan/koreksi. Tombol tutup mengembalikan konteks Explore.

### 6.5 My TAPETA / dashboard pengguna

Header atas berisi logo, **ikon notifikasi**, profil dan ikon keluar. Dashboard berisi ringkasan profil, kontribusi dengan status, poin/lencana (hanya dari event valid), tindakan lanjutan, preferensi akun dan privasi. Notifikasi dapat dibuka dari ikon header; unread count harus berasal dari backend. Tombol keluar menghapus sesi server/SDK dan kembali ke landing/halaman publik.

### 6.6 Komunitas dan kontribusi

Komunitas dapat dibaca tanpa login. Tampilkan cara kontribusi, kontribusi yang secara eksplisit dipilih untuk publik, ringkasan komunitas dan CTA **Tambah kontribusi**. Form kontribusi mewajibkan login sebelum pengiriman; pemilih titik peta bisa mencari alamat atau memilih koordinat tanpa memaksa izin lokasi perangkat. Validasi nama, kategori, koordinat, wilayah dan sumber. Foto opsional sampai kebijakan media ditetapkan; bila foto diunggah, hak penggunaan wajib disetujui.

Pengiriman menciptakan status `pending`; tidak muncul di peta publik. Pemilik melihat timeline status dan alasan moderator. Revisi hanya dapat dilakukan dalam status yang diizinkan. Pengiriman tidak serta-merta menambah poin.

### 6.7 Dashboard admin

Admin hanya setelah role diperiksa server-side. Komponen:
- Ringkasan: total destinasi publik, antrean pending, perlu perbaikan, jumlah kontributor aktif, distribusi kontribusi, dan coverage kota/kecamatan.
- Tinjauan: antrean dengan filter status/kota/kategori/tanggal, detail lokasi di peta, bukti/sumber, pemeriksaan duplikat, validasi koordinat dan sejarah pengajuan.
- Keputusan: setujui, minta perbaikan, tolak. Alasan wajib untuk perbaikan/tolak; konfirmasi sebelum keputusan final; semua tindakan masuk audit log.
- Kontributor: rekap agregat dan profil publik sesuai consent; data pribadi hanya untuk admin yang perlu akses.
- Riwayat: siapa melakukan apa, kapan, dan pada record mana; tidak dapat dihapus oleh moderator biasa.
- Kelola katalog/kategori/coverage dan paket ilustrasi sesuai izin role.
- Mobile: tab atas Ringkasan, Tinjauan, Kontributor, Riwayat; kontrol notifikasi, profil dan keluar dalam header atas.

Jangan sediakan akun admin default, password contoh yang diketahui publik, role dari localStorage, atau URL rahasia sebagai satu-satunya kontrol.

### 6.8 Kota baru

Kota tanpa paket ilustrasi menampilkan OSM netral, nama kota/provinsi, status “belum dieksplorasi”/coverage, batas yang memang tersedia, kosong/hasil pencarian, CTA kontribusi serta atribusi. Berikan penjelasan bahwa kota dapat dijelajahi walau belum memiliki ilustrasi. Jangan menampilkan kotak kosong besar atau peta yang terpotong.

## 7. Sistem desain

### 7.1 Prinsip

Nuansa **atlas perjalanan editorial Jepang**: hangat, terang, lapisan kertas, ilustrasi cat air, aksen merah bata dan hijau sage, detail halus. Terinspirasi tingkat tinggi dari travel planner editorial; jangan meniru aset/komposisi pihak lain. Gunakan bayangan lembut hanya untuk kartu mengambang; tanpa glossy, neon, glow, blur tebal, atau panel biru tua kosong.

### 7.2 Font

- Gunakan satu keluarga font aplikasi yang sama di seluruh halaman, komponen, desktop dan mobile: **Nunito Sans** (sesuai ekspor Pen). Impor variable font lokal lewat `@fontsource-variable/nunito-sans`; jangan mengandalkan font eksternal saat runtime.
- Fallback: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Bobot: 400 body; 500 secondary/navigation; 600 button/label; 700–800 wordmark/kicker penting. Judul hero boleh 400–600 sesuai frame; jangan ganti jenis font antarhalaman.
- Skala panduan: hero desktop clamp 52–84 px; hero mobile 34–40 px; heading halaman 28–40 px; heading kartu 18–24 px; body 14–16 px; metadata 11–13 px; label data minimum 10 px. Jangan mengecilkan teks berulang demi muat; susun ulang.
- Gunakan line-height 1.35–1.6 untuk body dan 1.0–1.15 untuk headline. Hindari letter spacing agresif kecuali label uppercase pendek.

### 7.3 Token warna

| Token | HEX | Penggunaan |
|---|---|---|
| `paper` | `#F7F0E4` | Latar halaman dan permukaan utama |
| `raised` | `#FFFCF6` | Kartu, input, sheet |
| `paper-deep` | `#EEE1CD` | Media placeholder, relief kertas |
| `ink` | `#1B2C35` | Teks utama, ikon utama, ink surface terbatas |
| `muted` | `#786E5F` | Metadata/teks sekunder |
| `line` | `#D8C8B2` | Border dan pemisah |
| `brick` | `#B63A2E` | CTA, pin utama, identitas |
| `brick-dark` | `#A95038` | Aksen teks/link |
| `sage` | `#5E7C64` | Status selesai/alam |
| `ochre` | `#D79766` | Status berjalan/aksen hangat |
| `sakura` | `#E7C3C6` | Aksen lembut dekoratif |
| status explored | `#CFDAC9` | Sudah dijelajahi |
| status in-progress | `#F4E7D4` | Sedang dijelajahi |
| status unknown | `#EEE9DD` | Belum ada data |
| ocean-light | `#BFE4E2` | Gradasi laut cat air landing |

Kunci warna menjadi CSS variables/design tokens. Warna gradient laut harus lembut, terinspirasi ilustrasi cat air, dominan terang; hindari biru tua solid sebagai latar besar. Ink/navy hanya untuk area kecil yang sengaja berkontras (misalnya callout/dashboard), bukan kolom kosong atau seluruh halaman.

Kategori memakai warna yang selalu disertai nama/ikon. Gunakan palet kategori yang sudah ada di `src/data/categories.ts` kecuali desain Pen terbaru menetapkan pengganti. Cek kontras teks dan marker, jangan mengubah kategori diam-diam. Untuk sticker pack awal dari daftar destinasi yang sudah disebut pengguna, jangan masukkan kafe atau kuliner; kategori tersebut boleh tetap tersedia untuk pengajuan komunitas berikutnya.

### 7.4 Logo dan ikon

- Sumber logo tunggal: `src/components/TapetaLogo.tsx`. Jangan menggambar ulang versi berbeda pada tiap page.
- Lambang: bidang krem membulat, dua kontur hijau seperti lapisan peta, garis/jalan merah, titik dan cincin lokasi merah. Wordmark “TAPETA” ditulis kapital; lockup opsional menggunakan tagline “Peta eksplorasi Indonesia” sesuai konteks.
- Pertahankan rasio, warna, clear space, keterbacaan dan versi mark-only favicon. Jangan menambahkan ikon pin atau wordmark alternatif yang bertentangan.
- Ikon UI gunakan inline SVG satu sistem stroke seragam (sekitar 1.7–2 px), rounded caps, ukuran umum 16/20/24 px; ikon selalu punya label aksesibel. Emoji bukan ikon navigasi inti.

### 7.5 Bentuk dan layout

- Radius: pill untuk chip, 8–12 px untuk kontrol/kartu, 16–24 px untuk modal/hero. Border 1 px warna `line`; bayangan rendah dan natural.
- Spacing grid dasar 4/8 px; desktop gunakan kolom yang fleksibel dan tidak mengunci peta menjadi strip sempit; mobile margin 16–20 px dan target sentuh minimal 44×44 px.
- Gunakan pattern/tekstur titik sangat halus hanya pada area yang mendukung keterbacaan. Jangan beri bingkai palsu pada ilustrasi peta Nusantara; jangan crop pulaunya.
- Semua state: default, hover, focus-visible, active, disabled, loading, empty, error, success. Hindari kontrol yang terlihat aktif namun tidak punya aksi.

## 8. Frontend dan komponen

- Pertahankan React + TypeScript + Vite + Leaflet selama tidak ada hambatan nyata.
- Pisahkan komponen UI dari query data dan logika otorisasi. Buat service layer bertipe (`auth`, `destinations`, `regions`, `submissions`, `moderation`, `notifications`, `media`, `coverage`). Komponen tidak mengakses Supabase langsung secara tersebar.
- Gunakan route yang dapat dibagikan/deep link untuk landing, Explore/kota, detail, My TAPETA, Komunitas, Admin. Refresh browser harus mempertahankan route yang aman.
- State peta/query/filter disinkronkan dengan URL bila wajar dan dipertahankan ketika detail ditutup.
- Tidak ada `onClick` dummy, `href="#"`, tombol dekoratif, halaman kosong `return null` untuk navigasi utama, atau statistik hardcoded. Bila fungsi belum dikonfigurasi, tampilkan pesan “belum tersedia” dan aksi alternatif jelas.
- Search, filter, kategori, tab peta/daftar/atlas, notifikasi, keluar, login, CTA, kartu stiker dan kontrol peta harus bekerja.
- Gunakan data fetching dengan abort, loading, error/retry, paginasi/infinite scroll yang terkontrol, cache untuk data publik dan invalidasi setelah moderasi.
- Aksesibilitas: keyboard, focus ring, label, dialog dengan fokus terkelola, alt text stiker, reduced motion, kontras WCAG 2.2 AA sebagai target.

## 9. Backend, autentikasi dan infrastruktur

### 9.1 Pilihan stack yang disarankan untuk MVP

Gunakan **Supabase** sebagai backend terkelola: PostgreSQL + PostGIS, Supabase Auth, Storage, Row Level Security (RLS), dan Edge Functions untuk operasi admin/unggah/operasi sensitif. Frontend tetap Vite/React. Pilihan ini menggantikan localStorage untuk data akun dan kontribusi. Semua rahasia/service-role hanya berada di Edge Functions/environment server, tidak di bundle browser.

Jika kredensial/proyek Supabase belum tersedia, implementasikan migrations, typed API/service, `.env.example`, dan local development setup tanpa berpura-pura bahwa fitur produksi aktif. OpenCode boleh meminta pengguna memasukkan kredensial/env ketika memang diperlukan untuk koneksi deploy; jangan meminta kredensial ditulis ke file yang dicommit.

### 9.2 Autentikasi dan role

- Gunakan Supabase Auth email/password dengan verifikasi email dan pemulihan password; social login hanya jika konfigurasi provider tersedia.
- Session dikelola SDK resmi, refresh dan logout nyata. Jangan menyimpan password/access token secara manual di localStorage custom.
- Buat profil saat user dibuat. Role default selalu `contributor`; role `admin`/`moderator` hanya ditetapkan melalui proses server/service-role terkontrol dan dicatat audit.
- Tidak ada self-service admin registration. Jangan memasukkan kredensial default. Admin awal dibuat melalui invitation/seed server-side yang dipandu environment dan segera diganti/diamankan.
- Otorisasi wajib ditegakkan oleh RLS/Edge Function, bukan hanya menyembunyikan menu pada UI.

### 9.3 Model database minimum

Gunakan UUID primary keys, `created_at`/`updated_at` UTC, foreign keys, check constraints, indeks, soft-delete/retention sesuai kebutuhan. Semua perubahan skema memakai migration SQL yang masuk version control.

1. `profiles`: `id` sama dengan `auth.users.id`, `display_name`, `avatar_path`, `bio`, `is_public`, `notification_preferences`, `created_at`, `updated_at`.
2. `user_roles`: `user_id`, `role` (`contributor`, `moderator`, `admin`), `granted_by`, `created_at`. Klien tidak boleh mengubah tabel ini.
3. `regions`: `id`, `parent_id`, `name`, `type`, `source`, `source_id`, `license`, `geom geography/geometry`, `is_active`, `created_at`, `updated_at`. Indeks PostGIS GIST; simpan geometri sumber dan atribusi.
4. `categories`: `id/slug`, `name`, `short_name`, `icon_key`, `color_token`, `is_active`, `sort_order`.
5. `destinations`: `id`, `name`, `category_id`, `location geography(Point,4326)`, `region_id`, `address`, `description`, `opening_hours`, `source_name`, `source_url`, `license`, `verification_status`, `published_at`, `created_by`, `updated_by`, timestamps. Data publik hanya status `published`.
6. `submissions`: `id`, `submitted_by`, `proposed_destination_id` nullable, seluruh field usulan, `location geography(Point,4326)`, `region_id`, `status` (`pending`, `needs_changes`, `approved`, `rejected`, `withdrawn`), `revision`, `submitted_at`, `updated_at`. Simpan versi payload atau revision agar keputusan dapat ditelusuri.
7. `submission_media`: `id`, `submission_id`, `storage_path`, `mime_type`, `size_bytes`, `checksum`, `license/permission`, `moderation_status`, timestamps. File berada di Storage, bukan byte database.
8. `moderation_decisions`: `id`, `submission_id`, `moderator_id`, `action`, `reason_public`, `note_internal`, `previous_status`, `new_status`, `created_at`. Immutable untuk role moderator biasa.
9. `notifications`: `id`, `user_id`, `type`, `title`, `body`, `resource_type`, `resource_id`, `read_at`, `created_at`.
10. `saved_places`: `user_id`, `destination_id`, `created_at` (opsional MVP bila fitur koleksi diaktifkan).
11. `point_events`: `id`, `user_id`, `submission_id`, `event_type`, `points`, `rule_version`, `created_at`; event idempotent agar keputusan tidak menggandakan poin.
12. `badges` dan `user_badges`: katalog lencana dan pencapaian.
13. `illustration_packages`: `id`, `region_id`, `asset_path`, `asset_version`, `bounds`, `mask_source`, `license`, `status`, `published_at`, `created_by`.
14. `reports`: laporan koreksi/penyalahgunaan dengan pelapor, resource, alasan, status dan audit.
15. `audit_events`: aktor, aksi, tabel/resource, perubahan aman, timestamp, metadata; tidak menyimpan password/token.

Destinasi punya sumber/provenance. Tidak boleh menampilkan kandidat seed sebagai verified. Data dari OSM yang belum ditinjau diberi badge “Sumber OSM · belum diverifikasi TAPETA” bila publikasinya diizinkan oleh kebijakan produk; jika seed belum disetujui, simpan sebagai staging/private sampai admin meninjau.

### 9.4 Akses RLS

- Anon: baca kategori aktif, wilayah dan paket ilustrasi publik, serta destinasi `published` saja.
- Pengguna: baca/ubah profil miliknya sesuai kolom yang diizinkan; baca usulan/notifikasi miliknya; buat submission atas nama dirinya; hanya mengubah usulan sendiri pada status dan field yang sah.
- Moderator: akses antrean dan memberi keputusan lewat Edge Function yang memeriksa role. Keputusan dan perubahan destinasi dilakukan transaksi atomik serta dicatat.
- Admin: operasi manajemen tambahan hanya melalui role/server yang sesuai; perubahan role tidak melalui klien biasa.
- Storage: bucket publik hanya berisi media yang sudah dipublikasi/thumbnail publik; bucket private untuk bukti usulan. Upload melalui policy terbatas dan signed URL, tipe file/ukuran diperiksa server-side.
- Jangan pakai `service_role` di variabel `VITE_*`. Jangan percaya `user_id`, `role`, status verifikasi, koordinat hasil klien tanpa validasi.

### 9.5 API / operasi

Gunakan Supabase query/service yang typed untuk baca biasa dan Edge Functions untuk tindakan sensitif. Operasi minimum:
- cari wilayah berdasarkan nama/parent;
- list destinasi `published` menurut bbox, kota, kategori dan query; paginasi;
- detail destinasi publik;
- submit/revisi/withdraw usulan;
- upload intent, validasi media dan delete sesuai policy;
- list kontribusi/notifikasi milik pengguna;
- admin queue dengan filter/pagination;
- keputusan moderasi approve/needs-changes/reject;
- statistik agregat admin dari data nyata;
- laporan koreksi/abuse;
- baca coverage dan illustration package.

Tindakan approve harus transaksi: validasi geometri/duplikasi → tulis destinasi publik/update → ubah submission → tulis keputusan/audit → buat notifikasi → tulis poin jika aturan aktif. Gagal sebagian harus rollback. Pengiriman ganda harus idempotent.

### 9.6 Media dan peta

- Foto hanya melalui upload yang tervalidasi, batas ukuran awal 10 MB (konfigurasi), format JPEG/PNG/WebP; tolak SVG/HTML dan file tidak cocok dengan MIME/signature. Hapus EXIF lokasi pribadi jika tidak diperlukan. Foto yang ditolak tidak dipublikasi.
- Simpan thumbnail/varian kompresi dan lisensi/consent. Sediakan mekanisme takedown.
- OSM tile/geocoding/routing adalah provider terpisah. Tampilkan atribusi wajib dan patuhi rate limit/ketentuan provider; jangan mengirim burst ke public Nominatim/Overpass. Rencanakan provider production/cache sesuai policy dan trafik.

## 10. Keamanan, privasi, reliabilitas

- RLS diuji untuk anon, contributor, moderator dan admin; otorisasi server-side.
- Validasi input server-side: koordinat WGS84/rentang, titik berada di wilayah pilihan dengan toleransi, panjang teks, URL sumber, kategori, media, dan duplicate check.
- Rate limiting/anti-spam pada signup, submit, report dan upload. Sanitasi output; cegah XSS/CSRF sesuai mekanisme SDK.
- Pisahkan data pribadi dari tampilan komunitas. Publikasi nama/avatar harus berdasarkan preferensi profil.
- Lokasi perangkat opsional; minta izin hanya setelah aksi pengguna dan jangan simpan riwayat lokasi secara default.
- Log moderasi immutable untuk moderator; sediakan backup DB dan prosedur restore. Jangan menghapus data lokal lama diam-diam: buat ekspor/migrasi yang transparan jika perlu.
- Rahasia di `.env.local`/secret manager dan `.env.example` berisi nama variabel tanpa value. File rahasia tidak masuk Git.

## 11. Environment dan deployment

`.env.example` mencantumkan sekurangnya `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, server-side `SUPABASE_SERVICE_ROLE_KEY`, `OSM_TILE_URL`/provider jika diperlukan, dan variabel deployment. Service role hanya dipakai di Edge Functions/CLI lokal, tidak di frontend.

Sertakan:
- langkah menyiapkan project managed dan menjalankan migrations;
- seed development yang diberi label non-production, tidak memberi role admin pada akun publik;
- scripts `dev`, `build`, `lint`, migration/local backend jika dipakai;
- deploy checklist untuk frontend, Edge Functions, RLS, Storage, OAuth/email redirect, secrets, domain, backups dan monitoring.

Jangan menyimpan data production atau credentials dalam fixture/screenshots/commits.

## 12. Analytics dan rekap

Metrik minimum: pencarian berhasil/zero-results, detail dibuka, kontribusi dimulai/dikirim, status moderasi, waktu moderasi, kontributor aktif, jumlah destinasi published dan coverage wilayah. Hindari mengirim koordinat lokasi pengguna atau data personal ke analytics. Dashboard admin memakai query agregat nyata, waktu dan filter eksplisit; jangan menampilkan angka mock yang tampak nyata.

## 13. Acceptance criteria

### Visual/responsif

1. Desktop dan mobile memakai identitas, font, palet dan konten yang sama dengan frame terbaru `TAPETA.pen`; mobile menyusun ulang layout tanpa menghilangkan fungsi penting.
2. Landing menampilkan Nusantara lengkap, laut cat air terang bergradasi, daratan watercolor hangat dan stiker landmark tiap gugus pulau minimal dua; tidak ada bingkai yang memotong pulau atau nomor intro 02/04.
3. CTA “Ayo Jelajah!” mudah ditemukan dan berfungsi; intro dapat dilewati.
4. Logo mark/wordmark seragam pada landing, Explore, akun, komunitas, detail, dashboard, favicon.
5. Saat detail destinasi terbuka desktop, panel kosong kiri tidak menyisakan kolom biru tua; peta/detail mengisi ruang dengan proporsional. Jangan menghapus panel gelap lain yang terpakai secara massal.
6. Kartu/stiker tidak menabrak judul, legenda, kontrol peta atau CTA pada viewport 390, 768, 1024 dan 1440 px.

### Peta/data

7. OSM dan overlay cat air Pekanbaru tetap sejajar pada pan, zoom, resize, dan beberapa titik kontrol; overlay tidak menjadi persegi opak di luar batas kota.
8. Marker/stiker, baris hasil, kartu pilihan, detail dan link rute (bila tersedia) merujuk destination ID/koordinat yang sama.
9. Kota tanpa ilustrasi tetap dapat dijelajahi dengan OSM netral dan empty/coverage state yang jelas. Tidak menampilkan data destinasi fiktif.
10. OSM attribution terlihat; status dihitung hanya dari destinasi terbit dan terverifikasi.

### Aplikasi/backend

11. Tombol utama dan tab berfungsi; tidak ada menu inti yang menghasilkan layar kosong.
12. Login/daftar/reset/logout berfungsi melalui backend terkonfigurasi; saat env tidak ada, aplikasi menyebut konfigurasi yang belum tersedia dan tidak berpura-pura masuk.
13. Contributor hanya melihat/mengubah data sendiri. Pengguna biasa tidak dapat memperoleh role admin dengan mengubah browser storage/request.
14. Usulan baru tersimpan di DB sebagai pending dan tidak terlihat publik sebelum keputusan approve.
15. Moderator dapat melihat bukti, peta, duplicate hint, menyetujui/meminta revisi/menolak dengan alasan; event dan notifikasi tersimpan.
16. Admin dashboard menunjukkan metrik nyata dan rekap yang konsisten dengan database.
17. RLS menolak anon mengakses record private, contributor mengubah role/status publik, atau contributor membaca data privat pengguna lain.
18. Kegagalan jaringan/API, peta, auth dan upload memiliki pesan/retry; loading/empty/error state konsisten.
19. Atribusi dan lisensi semua sumber peta/data/media tercatat.

## 14. Rencana implementasi untuk OpenCode

Kerjakan berurutan, jangan mencoba mengganti seluruh aplikasi sekaligus tanpa review hasil:

1. **Audit repo dan snapshot:** baca PRD ini, `TAPETA.pen` melalui MCP yang sesuai (jangan membaca file `.pen` dengan shell), ekspor Pen, `README.md`, kode dan aset; catat routes/komponen yang sudah benar dan semua placeholder/dummy. Jangan edit `sources/` atau menghapus asset.
2. **Design foundation:** satu font Nunito Sans, tokens dari bagian 7, logo tunggal, komponen header/mobile nav/buttons/chips/cards/dialog. Cocokkan landing web/mobile dengan Pen, pastikan peta Nusantara utuh dan gradient aquarel lembut.
3. **Map integration:** mask ilustrasi Pekanbaru sesuai geometri batas; validasi lat/lon dan stack z-index; semua sticker markers terikat ke OSM dan navigasi detail. Perbaiki panel kosong kiri pada detail desktop. Buat unillustrated city state.
4. **Frontend page parity:** selesaikan landing, Explore desktop/mobile, detail, My TAPETA, Komunitas, contribution, user/admin dashboard, admin queue/history, notification, city-not-explored. Pastikan semua CTA/navigasi berfungsi.
5. **Backend foundations:** migrations, types, Supabase client, `.env.example`, auth, profile/role dan RLS. Jangan buat admin default.
6. **Contribution/moderation:** submission, media upload, private review, transactional decision, audit, notification dan point ledger.
7. **Data/seed:** validasi sumber destinasi dan batas, tandai data tidak diverifikasi sebagai candidate. Tidak ada seed kandidat yang langsung published.
8. **Quality gates:** run existing build/lint, implementasikan pemeriksaan yang sudah didefinisikan project, cek viewport dan aksesibilitas; jangan menambah test suite baru tanpa permintaan. Laporkan yang lolos/gagal secara akurat.
9. **Dokumentasi akhir:** update README setup frontend/backend, env, migrations, deployment, admin bootstrap, OSM attribution/provider limits dan known limitations. Catat bila backend belum bisa dihubungkan karena kredensial/provider belum diberikan.

### Instruksi eksekusi singkat untuk OpenCode

> Baca `TAPETA_PRD_OPENCODE.md` sampai selesai sebelum mengubah kode. Gunakan `TAPETA.pen` dan `TAPETA-pen-export.html` sebagai acuan desain paling baru. Implementasikan perubahan pada repo ini, bukan hanya membuat mockup atau prompt lain. Pertahankan aset yang sah. Prioritaskan kesesuaian landing desktop/mobile, peta OSM yang menyatu dengan ilustrasi cat air Pekanbaru dan stiker berkoordinat, perbaikan kolom biru tua kosong pada mode detail, tampilan kota yang belum berilustrasi, lalu backend akun/admin/kontribusi. Jangan mengklaim autentikasi/administrasi berhasil bila backend belum dikonfigurasi. Buat migrations/RLS dan `.env.example`; jangan memasukkan secret. Kerjakan bertahap, build/lint sesuai skrip yang sudah ada, dan laporkan file yang diubah, alur yang sudah nyata, env yang masih dibutuhkan, serta batasan data/lisensi.

## 15. Keputusan operasional yang masih membutuhkan pemilik produk

Keputusan berikut tidak boleh diisi dengan asumsi yang disajikan sebagai fakta. OpenCode boleh menyiapkan struktur dan menandai konfigurasi yang menunggu:

1. Kredensial project Supabase dan nama domain production.
2. Provider tile/geocoding/routing production dan batas penggunaan.
3. Sumber resmi/lisensi final data destinasi, batas kecamatan dan landmark Nusantara.
4. Daftar landmark final untuk minimal dua stiker per gugus pulau; cek ejaan/nama resmi, lokasi dan hak aset.
5. Formula poin/lencana serta kebijakan tampil publik untuk profil kontributor.
6. SLA moderasi, jumlah moderator, proses banding dan retensi bukti.
7. Kebijakan privasi, masa retensi, penghapusan akun/data dan kontak takedown.
8. Batas media akhir, consent/lisensi foto, serta policy penyimpanan.

Sampai keputusan dibuat, UI/data harus menampilkan keadaan “belum tersedia” atau “menunggu keputusan”; jangan membuat nilai demo terlihat sebagai data produksi.
