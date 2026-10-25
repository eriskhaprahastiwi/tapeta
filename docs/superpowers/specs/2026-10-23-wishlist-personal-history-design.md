# Wishlist dan riwayat pribadi My TAPETA

## Tujuan dan keputusan pengguna

Pengguna ingin menyimpan tempat untuk dikunjungi, lalu melihat jejak aktivitas pribadi. Wishlist menerima lokasi OSM dan destinasi TAPETA yang sudah diterbitkan. Usulan yang belum diterbitkan bukan sumber wishlist. Linimasa bersifat pribadi, bukan feed semua pengguna.

Termasuk: filter kota, tandai sudah dikunjungi, tanggal kunjungan yang dapat diubah, ajakan menulis cerita, pencegahan duplikasi, serta penyimpanan lintas perangkat melalui akun Supabase.

## Permukaan dan interaksi

- Pertahankan identitas TAPETA: Nunito Sans, kertas krem, tinta gelap, aksen bata. Mode permukaan My TAPETA adalah Operate. Tambahan ini tidak mengubah tata letak landing atau peta dasar.
- Tambahkan bagian `Ingin dikunjungi`, `Sudah dikunjungi`, dan `Linimasa` pada navigasi My TAPETA desktop dan mobile. Kontribusiku dan akses admin tetap tersedia.
- Tombol bookmark `Simpan` / `Tersimpan` tersedia di detail destinasi Explore desktop/mobile, kartu cerita Komunitas (termasuk profil kontributor), hasil OSM setelah dipilih, dan preview lokasi di peta yang sudah memiliki aksi detail. Tombol memiliki nama aksesibel dan `aria-pressed`; jangan menaruh tombol di dalam tombol lain.
- Tombol Simpan pada akun tamu membuka dialog masuk. Jangan mengklaim tersimpan sebelum server mengonfirmasi. Setelah masuk pengguna dapat mengulangi aksi, tanpa kehilangan lokasi yang sedang dilihat.
- Daftar pribadi menampilkan nama, kategori jika diketahui, kota, dan status sumber: `Terverifikasi TAPETA` atau `Lokasi OSM`. Tempat TAPETA yang kemudian diarsipkan tetap tampak sebagai tersimpan dengan label `Tidak lagi diterbitkan`, bukan masih terverifikasi.
- Filter kota memakai kota dari item milik pengguna, bukan hanya kota yang sedang dibuka di Explore. Filter `Semua kota` menjadi default.
- Aksi item: `Lihat di peta`, `Petunjuk arah`, `Hapus dari wishlist`, dan `Tandai sudah dikunjungi`. Menghapus wishlist tidak menghapus kunjungan atau aktivitas yang sudah dicatat.
- Kunjungan adalah satu status per tempat, bukan sistem perjalanan berulang. Pengguna dapat mengubah tanggal, membatalkan status kunjungan, serta menyimpan tempat lagi. Tanggal awal hari ini, tidak boleh di masa depan. Tampilkan perbedaan tanggal kunjungan dan waktu pencatatan bila tanggal diubah.
- Pilihan teknis pembuat: penyimpanan dan kunjungan merupakan dua status terpisah. `Ingin dikunjungi` menampilkan tempat tersimpan yang belum dikunjungi; `Sudah dikunjungi` menampilkan kunjungan. Menandai dikunjungi tidak membuang bookmark, dan membatalkan kunjungan mengembalikan tempat ke daftar ingin dikunjungi bila bookmark masih ada. Menghapus bookmark tidak menghapus riwayat kunjungan.
- Sesudah menandai dikunjungi, tawarkan `Tulis cerita` melalui formulir kontribusi yang sudah ada, dengan data tempat terisi dan konteks bahwa kontribusi diperiksa sebelum terbit. Bukan publikasi review otomatis. Komunitas saat ini memang menampilkan cerita dari kontribusi yang telah diterbitkan; jangan membuat halaman review semu.
- `Lihat di peta` lintas kota harus memuat kota tujuan dahulu, kemudian fokuskan koordinat yang tersimpan. OSM tidak berubah menjadi destinasi terverifikasi hanya karena dibuka dari My TAPETA.
- Semua bagian memiliki keadaan belum masuk, memuat, kosong, gagal dengan coba lagi, dan sukses. Tidak ada data aktivitas buatan.

## Linimasa

Linimasa menampilkan kejadian terbaru lebih dahulu dan dikelompokkan menurut tanggal. Jenis aktivitas:

1. Tempat disimpan ke wishlist.
2. Tempat ditandai dikunjungi, termasuk tanggal kunjungan pilihan pengguna.
3. Tanggal kunjungan diubah atau kunjungan dibatalkan, dengan deskripsi tindakan yang akurat.
4. Usulan milik pengguna dikirim serta keputusan moderasinya (diterbitkan, perlu perbaikan, ditolak) berdasarkan waktu yang memang tersimpan.

Tidak ada aktivitas `review dipublikasikan` bila aplikasi belum memiliki data review tersebut. Cerita kontribusi terbit tercakup pada aktivitas penerbitan usulan. Riwayat simpan dan kunjungan dimulai sejak fitur dipakai; jangan mengarang aktivitas masa lalu. Riwayat kontribusi lama boleh ditampilkan dari data server yang sudah ada.

## Penyimpanan dan privasi

- Migrasi baru untuk tempat pribadi, wishlist, kunjungan, dan peristiwa pribadi. Semua tabel pribadi menggunakan RLS pemilik berdasarkan `auth.uid()`; admin pun tidak mendapat akses umum ke wishlist orang lain.
- Tempat TAPETA disimpan berdasarkan destination UUID dengan snapshot data yang diperlukan agar item tetap terbaca bila arsip berubah. Data nama, kota, koordinat, status penerbitan untuk destinasi diambil server dari katalog, bukan dipercaya dari klien.
- Tempat OSM memakai kunci identitas `node/way/relation + osm_id`, URL sumber terkanonisasi, koordinat, nama, alamat, dan metadata kota. Validasi rentang koordinat, panjang teks, URL, dan bentuk identitas. Jangan memakai API Nominatim untuk lookup setiap kali membuka wishlist.
- Cegah duplikasi lintas Explore dan Komunitas dengan destination UUID. Untuk OSM dan destinasi terbit, gunakan OSM ID bila tersedia melalui URL sumber destinasi. Jangan menggabungkan tempat hanya berdasarkan nama atau kedekatan koordinat. Bila katalog tidak memiliki OSM ID, tidak ada dasar yang andal untuk menyimpulkan kedua item identik; ini batas deduplikasi yang disampaikan dalam implementasi.
- Simpan/hapus dan tandai/batalkan kunjungan harus idempoten serta aman untuk klik ganda dan permintaan bersamaan. Catat peristiwa hanya saat perubahan nyata terjadi.
- Gunakan RPC terautentikasi untuk operasi multi-tabel atomik. Tolak sumber usulan yang belum terbit. Wishlist tidak memengaruhi status jelajah kecamatan atau jumlah destinasi terbit.
- Sinkronisasi antarkomponen sesudah operasi berhasil, bersihkan cache ketika akun berubah atau keluar. Data akun A tidak boleh muncul pada akun B.
- Linimasa membaca peristiwa pribadi ditambah usulan/keputusan milik pemilik. Batasi jumlah/paginasi; jangan memuat seluruh sejarah tanpa batas.

## Verifikasi

- Uji SQL dalam transaksi rollback: tamu ditolak; akun B tidak membaca atau mengubah milik A; simpan ganda tidak menduplikasi; destinasi belum terbit ditolak; OSM valid diterima; kunjungan dan tanggal tervalidasi; peristiwa tercatat sekali; menghapus wishlist tidak menghapus kunjungan.
- Uji browser desktop 1440 dan mobile 320/390: simpan dari Explore/Komunitas/OSM; status tombol sinkron; wishlist dan filter kota; tandai/ubah/batalkan kunjungan; linimasa; navigasi peta dan arah; prompt masuk; error/retry; pergantian akun; keyboard, fokus, dan overflow.
- Jalankan typecheck, lint, build, dan pemeriksaan UI yang relevan. Jangan mengklaim sudah live sebelum deployment diminta dan diverifikasi.

## Batas cakupan

Tidak mencakup wishlist publik, koleksi bersama, rekomendasi algoritmik, impor data riwayat palsu, tracking GPS otomatis, atau sistem review publik baru. Tidak perlu mengubah kredensial admin maupun pengaturan email.

## Pilihan teknis pembuat

Gunakan React dan Supabase yang sudah ada, tanpa dependensi UI baru. Gunakan sumber OSM yang telah disetujui dan metadata kota yang ada; bila pembukaan lokasi lintas kota gagal memuat batas, tampilkan kegagalan yang bisa dicoba ulang dan tetap sediakan petunjuk arah eksternal.

## Cerita kunjungan disetujui pengguna

Pengguna memilih sekalian cerita kunjungan dengan moderasi admin. Ketentuan sebelumnya tentang memakai formulir kontribusi tempat diganti: buat cerita yang terkait tempat pribadi/destinasi, bukan usulan destinasi baru. Setelah ditandai dikunjungi, pengguna dapat mengirim cerita 20–5000 karakter. Cerita berstatus pending, published, rejected, atau needs_revision; pemilik dapat memperbaiki dan mengirim ulang cerita yang belum terbit. Admin/moderator memiliki antrean cerita dan wajib memberi alasan saat meminta perbaikan/menolak. Keputusan dicatat di linimasa pemilik. Cerita yang diterbitkan tampil pada Komunitas, dengan nama hanya bila public_profile aktif; selain itu tampil sebagai Kontributor. Bookmark, tanggal kunjungan, dan riwayat pribadi tidak ikut dipublikasikan. Cerita OSM tetap berlabel sumber OSM, tidak mengubahnya menjadi destinasi terverifikasi. Setiap pemilik memiliki paling banyak satu cerita aktif per tempat; kirim ulang memperbarui cerita tersebut. Penarikan cerita terbit bukan cakupan tahap ini.
