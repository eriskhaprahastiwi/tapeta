# TAPETA

Temukan tempat, bagikan cerita. React, TypeScript, Vite, Leaflet/OSM, dan Supabase.

Acuan implementasi: `TAPETA_PRD_OPENCODE.md`, canvas `TAPETA.pen`, serta instruksi terbaru pemilik produk. Landing desktop/mobile tidak memakai stiker landmark.

## Revisi Dani Sensei

Perubahan peta, time picker, komunitas, polling, moderasi dan notifikasi dijelaskan di [docs/DANI_SENSEI_REVISIONS.md](docs/DANI_SENSEI_REVISIONS.md). Terapkan migrasi `202610280001_community_and_screening.sql` sebelum frontend baru; workflow Pages tidak menjalankan migrasi database.

## Menjalankan frontend

```sh
npm install
npm run dev -- --port 5178
```

Preview lokal: http://127.0.0.1:5178/

```sh
npm run typecheck
npm run lint
npm run build
```

Route: `#explore`, `#atlas`, `#komunitas`, `#contribute`, `#my`, `#kotabaru`, `#admin-dash`, `#admin`, `#admin-contributors`, `#admin-history`.

Tanpa konfigurasi Supabase, landing dan peta OSM berfungsi, tetapi katalog resmi kosong. Form akun menjelaskan konfigurasi yang diperlukan. Tidak ada login lokal, akun admin default, atau kontribusi palsu yang disimpan sebagai data server.

## Setup Supabase

1. Buat project pengembangan Supabase. Aktifkan PostGIS pada schema `public` atau `extensions`.
2. Jalankan migration dalam urutan berikut melalui SQL Editor atau migration runner Supabase:
   - `supabase/migrations/202610210001_tapeta_core.sql`
   - `supabase/migrations/202610220001_harden_access.sql`
3. Untuk database yang sudah menjalankan migration pertama, jalankan hanya migration kedua. Perubahan search path pada migration pertama ditujukan untuk instalasi baru; migration kedua juga memperbarui fungsi antrean yang sudah ada.
4. Salin `.env.example` menjadi `.env.local`. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` memakai URL project dan publishable/anon key. Restart Vite.
5. Pada Auth → URL Configuration, isi Site URL dan Redirect URLs untuk origin/path frontend, termasuk `http://127.0.0.1:5178/` untuk pengembangan.
6. Aktifkan email confirmation, konfigurasi SMTP dan rate limit Auth. Uji email verifikasi serta pemulihan password pada alamat yang dimiliki.
7. Service-role key dan DB URL hanya untuk tooling server. Jangan pernah memakai awalan `VITE_` pada secret tersebut.

Moderasi memakai PostgreSQL RPC `SECURITY DEFINER` dengan pemeriksaan role, row lock, validasi, dan satu transaksi. UI tidak memegang service-role key. Tidak ada Edge Function atau upload media yang dideploy dalam repo ini.

### Admin pertama

Daftar/verifikasi akun milik pengelola. Ambil UUID dari dashboard Auth, lalu jalankan sebagai pemilik project di SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = '<UUID_AKUN_PENGELOLA>';
```

Perubahan role tercatat dalam `audit_events`. Jangan memberikan role lewat metadata pengguna. Keluar dan masuk kembali untuk memuat role terbaru, lalu buka `/#admin-dash`. Antrean ada di `/#admin`. Pengguna biasa ditolak pada tindakan moderasi oleh database.

## Pemeriksaan database

Fixture pengujian: `supabase/tests/access_and_moderation.sql`. Jalankan pada project pengembangan kosong setelah seluruh migration. Script melakukan rollback dan memeriksa:

- Metadata signup tidak menaikkan role.
- Kolom role dan isi notifikasi tidak dapat diedit pengguna.
- Penulisan submission langsung tidak dapat melewati RPC.
- Pengguna B tidak membaca submission pengguna A.
- Contributor tidak dapat memberi keputusan.
- Pending tidak tampil di destinasi publik.
- Permintaan revisi → revisi → persetujuan → notifikasi.
- Persetujuan berulang tidak menggandakan destinasi atau event.
- Anon tidak membaca submission privat.

Dengan PostgreSQL client yang tersedia:

```sh
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/access_and_moderation.sql
```

Script ini **belum dijalankan di database** pada sesi implementasi karena tidak ada konfigurasi project, CLI Supabase, Docker, atau PostgreSQL lokal yang tersedia. Build frontend bukan bukti migration maupun RLS sudah lolos.

## Identitas katalog dan proses impor

- Kota memakai `osm:relation:<id>`, contohnya `osm:relation:16563796` untuk Pekanbaru. Nama kota bukan primary key.
- Destinasi publik memakai UUID server. Stiker terikat lewat `destination_stickers.destination_id`, bukan pencocokan nama.
- `src/data/destinations.ts`, `src/data/atlas.ts`, dan aset stiker lama tetap disimpan sebagai bahan editorial. Katalog contoh tersebut tidak lagi digabung otomatis ke peta publik.
- Sebelum impor, catat ID sumber, URL, lisensi, koordinat, kota, tanggal pemeriksaan dan persetujuan editorial. Gunakan `catalog_source_id` yang unik untuk identitas impor. Periksa konflik berdasarkan ID sumber dan koordinat; jangan menghapus berdasarkan nama yang sama.
- Impor kandidat melalui submission untuk ditinjau, bukan langsung mengisi tabel destinasi. Hanya keputusan publikasi yang memasukkan destinasi ke katalog.
- Database lama mungkin memiliki `city_id` berbasis slug seperti `pekanbaru`. Buat pemetaan eksplisit slug → relation ID, tinjau record yang terdampak, lalu migrasikan sebelum membuka katalog tersebut. Tidak dilakukan konversi nama secara otomatis.
- Pasangkan aset stiker ke UUID destinasi setelah lisensi dan identitas diperiksa. Path frontend yang diterima: `/assets/stickers/<slug>.png`. Atur `published=true` hanya setelah diperiksa.

## Peta dan aset

- Leaflet memegang koordinat marker/stiker dan pan/zoom. Di zoom rendah marker dibuat ringkas; ilustrasi stiker terbit tampil mulai zoom 14.
- Peta Pekanbaru memakai geometri vektor OSM/OpenFreeMap dengan palet cat air dan klip batas kecamatan GeoJSON. Overlay raster jalan rekaan tidak lagi dirender. Toggle gaya mempertahankan viewport; OSM menjadi cadangan bila WebGL atau peta vektor gagal. Akurasi mengikuti data sumber, bukan klaim survei resmi.
- Data batas: `public/data/pekanbaru-kecamatan.geojson`, OSM/ODbL. Refresh melalui `node scripts/fetch-boundaries.mjs`; hindari permintaan berulang ke provider publik.
- Kota lain dapat dicari lewat Nominatim. Bila hasil Overpass sah tetapi tanpa batas kecamatan, viewport memakai bounds kota dan memberi status batas belum tersedia. Kegagalan jaringan tetap ditampilkan sebagai error.
- Cache batas wilayah menggunakan IndexedDB selama 90 hari. Lokasi perangkat hanya diminta setelah tindakan pengguna.
- Landing menggunakan `public/assets/map/nusantara-complete.svg`, siluet Natural Earth 1:50m dengan tekstur aset cat air sebelumnya. Pulau dibentuk lengkap, termasuk bagian negara tetangga pada pulau yang sama, untuk komposisi editorial. Provenance: `nusantara-complete.source.json`.
- Regenerasi aset landing: `node scripts/build-nusantara.mjs` (memerlukan jaringan untuk sumber Natural Earth). Aset asli tidak ditimpa.
- `VITE_OSM_TILE_URL` dapat diisi untuk provider tile produksi. Tetap tampilkan atribusi dan patuhi kebijakan provider.

## Batas kesiapan saat ini

- Backend, email, RLS, dan alur end-to-end belum dibuktikan di project Supabase nyata.
- Foto tambah lokasi disembunyikan. Dokumentasi komunitas memakai bucket privat dan pemeriksaan gambar sebelum publikasi setelah migrasi baru diaktifkan. Storage/RLS dan alur backend baru masih perlu diuji di Supabase pengembangan. Prosedur takedown, retensi, dan penghapusan akun tetap memerlukan keputusan pengelola.
- Formula poin/lencana belum disetujui, sehingga penghargaan dinonaktifkan, bukan dihitung dari angka lokal.
- Revisi saat ini mencakup nama, alamat, deskripsi, dan sumber. Perubahan koordinat/kategori pada revisi belum tersedia.
- Filter moderasi status tersedia; filter tanggal/kota/kategori, pengelolaan katalog, dan paginasi server masih perlu dilengkapi.
- Koreksi dari detail membuka kontribusi baru; workflow laporan yang terhubung ke destinasi lama belum lengkap.
- Kesetaraan seluruh state akun/admin dengan Pen belum dapat diuji tanpa data backend. Halaman publik dan keadaan tanpa akun diperiksa di browser.
- Provider geocoding/routing produksi, kebijakan privasi, sumber/lisensi aset final, dan prosedur backup/restore masih perlu keputusan pengelola.
