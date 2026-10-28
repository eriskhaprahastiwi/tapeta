# Revisi Dani Sensei

Implementasi memakai sumber `eriskhaprahastiwi/tapeta`, dasar commit `0058671`. File HTML referensi proyek tidak dipakai. Landing Nusantara, font Nunito Sans, panel Explore gelap, navigasi dan stiker asli dipertahankan.

## Perubahan

1. Peta Pekanbaru menggunakan geometri vektor OpenStreetMap/OpenFreeMap, bukan jalan dan sungai rekaan di gambar raster. Palet kertas krem, warna lembut kecamatan, air aqua, serta tekstur kertas mengikuti arah cat air yang berlaku. Vektor dipotong ke batas kecamatan GeoJSON yang sudah dipakai aplikasi. Marker dan peta memakai proyeksi yang sama. Detail bertambah saat zoom. Toggle gaya mempertahankan posisi dan zoom, dan peta OSM tetap tersedia saat WebGL/sumber vektor gagal. Ini interpretasi kartografi dari gaya lama, bukan lukisan identik piksel demi piksel. Akurasi mengikuti kelengkapan OSM; batas administratif ini bukan produk survei resmi.
2. Form tambah lokasi memakai time picker buka/tutup, pilihan 24 jam, validasi pasangan jam, dan keterangan untuk jam tutup pada hari berikutnya. Kolom foto tambah lokasi yang sebelumnya nonaktif disembunyikan.
3. Komunitas menjadi feed cerita kunjungan, issue dan Q&A, tanpa tutorial kontribusi atau leaderboard sebagai halaman utama. Posting memiliki suara, komentar, laporan dan paginasi. Cerita/issue memilih destinasi terbit; Q&A boleh tanpa lokasi.
4. Dokumentasi komunitas disimpan di bucket privat, maksimum empat gambar JPG/PNG/WebP masing-masing 5 MB. Gambar harus diperiksa sebelum publikasi; daftar kata bukan pemeriksa gambar. Akses file mengikuti status posting dan pemiliknya.
5. Aturan konten mencakup SARA, rasisme, pornografi, pelecehan, ancaman, data pribadi, spam, penipuan dan lokasi palsu. Pemeriksaan server memakai aturan frasa yang dapat diaktifkan/ditambahkan moderator. Frasa eksplisit diblokir, kata ambigu diperiksa dalam konteks. Daftar awal adalah titik awal yang perlu dikembangkan dari kasus nyata, bukan daftar lengkap semua pelanggaran.
6. Usulan lokasi diperiksa kelengkapannya oleh validasi server yang sudah ada, lalu penyaringan konten dan kemungkinan duplikasi. Usulan lolos dapat dipolling oleh akun dengan email terverifikasi: satu suara per akun/usulan, pengusul tidak memilih sendiri, alasan wajib untuk keberatan, polling 72 jam. Tiga suara dan dukungan dua pertiga menjadi syarat normal. Polling tidak otomatis menerbitkan lokasi. Pengecualian pemeriksaan manual membutuhkan alasan minimal 20 karakter.
7. Admin/moderator masuk langsung ke verifikasi. Menu ringkasan dan kontributor tidak lagi menjadi navigasi utama admin. Verifikasi katalog dan riwayat tetap tersedia.
8. Notifikasi berasal dari insert usulan nyata, terhubung ke ID usulan dan dapat membuka detail yang tepat. Pemeriksaan notifikasi dilakukan saat panel dibuka, saat kembali ke tab, dan setiap 30 detik selama tab terlihat. Tidak ada notifikasi uji yang ditambahkan oleh perubahan ini; record uji lama dalam database tidak dihapus.
9. Panel verifikasi memakai teks terang pada latar gelap. Filter membedakan lolos sistem/polling, ditandai sistem, dan menunggu polling. Konten komunitas meragukan serta gambar masuk antrean terpisah dalam halaman verifikasi.

## Urutan aktivasi

Jangan deploy frontend baru sebelum migrasi server selesai: frontend baru memakai kolom dan RPC baru.

1. Terapkan seluruh migrasi lama pada Supabase pengembangan, lalu `supabase/migrations/202610280001_community_and_screening.sql`.
2. Jalankan `supabase/tests/community_and_screening.sql` di database pengembangan sekali pakai. Script memakai transaksi dan rollback. Jangan memakai database produksi untuk fixture pengujian.
3. Hubungkan frontend pengembangan dengan URL dan anon/publishable key Supabase, melalui pengaturan lingkungan yang sudah dipakai proyek. Jangan masukkan service-role key ke frontend atau Git.
4. Uji akun pengusul, tiga pemberi suara, dan moderator: konten terlarang, duplikasi, suara sendiri, perbarui suara, ambang dua pertiga, notifikasi, keputusan, gambar privat, pelaporan, dan perubahan aturan.
5. Setelah hasilnya sesuai, terapkan migrasi produksi lalu deploy frontend dari cabang yang telah ditinjau. Workflow GitHub Pages hanya membangun frontend; tidak menerapkan migrasi Supabase secara otomatis.

## Hasil verifikasi sesi

- TypeScript dan build produksi lulus.
- Sintaks migrasi SQL dan 14 badan fungsi PL/pgSQL diperiksa dengan parser PostgreSQL.
- Pratinjau browser dipakai untuk memeriksa peta, pergantian gaya, zoom, halaman komunitas dan keadaan backend belum dikonfigurasi.
- Uji transaksi Supabase, storage dan akun nyata belum dijalankan: konfigurasi backend tidak tersedia dalam checkout ini. Pemeriksaan parser bukan bukti RLS dan RPC telah lulus di server.
- Audit dependensi: dependensi peta baru telah diperbarui untuk menghindari advisory versi lama; advisory dari dependensi `osmtogeojson` yang sudah ada tidak diubah dalam revisi ini.

Sumber kartografi: https://openfreemap.org/quick_start/ dan https://www.openstreetmap.org/copyright.
