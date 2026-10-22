# Surface brief — Beranda (Home / Landing)

## Scope & mode
Permukaan baru satu rute: beranda Tapeta. Mode **Persuade** — pengunjung pilih membuka peta interaktif atau melihat status kecamatan. Rute kedua (app peta interaktif) sudah ada.

## Audience / job / action
Penjelajah baru membuka Tapeta pertama kali. Tugas: pahami 3 detik bahwa ini peta eksplorasi kota, lalu buka peta interaktif Pekanbaru atau langsung lihat status kecamatan. Buktinya fungsi nyata: peta dan angka yang tampil semuanya data OpenStreetMap nyata (35 destinasi, 15 kecamatan, status 1/11/3), bukan mockup.

## Direction contract
THESIS: "kertas adalah kota" — peta Pekanbaru digambar sebagai lembar dokumen krem yang bisa dijelajahi, menolak tampilan landing generik dengan hero statis tanpa data. Bukan hero abstrak; komposisi memakai wilayah nyata dan status nyata.

OWN-WORLD: krem kertas `#f6efe2` dengan motif titik hanlftone terang; ink `#20262b` untuk panel gelap dan sayap peta; maroon `#a63d2f` untuk tindakan primer; sakura `#eeb7b0` untuk kicker/pelengkap; olive `#5f7b58` dan teal `#3f6f6a` untuk status. Ikon garis 1.5px. Bentuk tegas: pill nav putih denganaksi maroon, peta berupa SVG krem + poligon kecamatan asli + pin kelas warna, kartu "Lokasi Terdepan" berupa cover art SVG koordinat.

STORY: Pengunjung tahu: (1) Tapeta menunjukkan status jelajah kecamatan Pekanbaru sekarang, (2) data dari OpenStreetMap dan belum diverifikasi admin, (3) membuka peta interaktif adalah langkah pertama untuk mulai menjelajah.

FIRST VIEWPORT: nav putih atas (logo, link, CTA maroon "Buka peta"), lalu hero dua kolom: kirisan setting tipografis besar "Peta eksplorasi Pekanbaru" + dua CTA + baris status "1 dijelajah / 11 sedang / 3 belum"; kolom kanan peta krem dengan poligon kecamatan dan 3 label kecamatan. Primary button "Buka peta interaktif" paling atas di kolom kiri. Berita peta melewati fold hanya bila layar sangat pendek: tampilan pertama tetap selesai di atas.

FORM: bentuk terpilih — potong dari dunia "atlas kertas + antarmuka gelap" dengan referensi Japan Trip Planners (Pinned). Signature interaction: ketika pengunjung menekan salah satu poligon/tombol kategori di showcase, pin kategori yang menyala berganti v vigilance secara langsung; angka status di barisan teratas tetap real time. SEED REFERENCE: tidak tersedia (directidn dipin user).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Memorable moment
Sakura-kicker, lalu poligon kecamatan di peta krem muncul dengan animasi bloom ringan: satu satu, lalu label kecamatan naik. Tajam dan cepat, < 900ms.

## Unresolved
Beranda mungkin setelah v1 jadi jalan masuk ke peta langganan? — biarkan di fase berikutnya: tak ada fitur premium; CTA semuanya gratis, link ke info MVP.
