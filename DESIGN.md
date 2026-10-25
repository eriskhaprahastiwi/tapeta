# DESIGN.md — TAPETA

Arah desain yang berlaku, diselaraskan dengan kode berjalan (`src/index.css`, `src/tapeta/tapeta.css`, `src/tapeta/landing.css`). Sebelumnya dokumen ini menyebut Bricolage Grotesque / Instrument Sans / IBM Plex Mono dengan palet yang berbeda; implementasi memakai satu keluarga huruf dan token `--t-*` di bawah, dan pemilik produk memilih arah itu. Nilai di sini adalah sumber acuan untuk kerja berikutnya.

## Arah

Atlas editorial yang bisa dijelajahi: kertas krem hangat, garis tipis, label kecil, peta cat air Nusantara sebagai pembuka, dan panel tinta gelap untuk kerja peta. Produk ini peta, jadi gambar utama adalah kartografi sendiri, bukan foto tempat. Semua angka di layar berasal dari data terbit.

Dial yang berlaku (diturunkan dari hasil render, bukan diklaim): **ENERGY 3 / RHYTHM 3 / MOTION 1**.

- ENERGY 3: palet hangat dengan satu aksen bata yang tegas, judul besar di landing.
- RHYTHM 3: landing penuh, panel Explore gelap, dokumen krem untuk My TAPETA/Komunitas, panel geser untuk kontribusi.
- MOTION 1: hanya transisi warna/opasitas; tidak ada animasi masuk, parallax, atau gerak dekoratif.

## Tipografi

- Satu keluarga: **Nunito Sans** (variable) untuk display, body, dan label teknis. Alasan: bentuk bulat lembut cocok dengan nada hangat/personal ("cerita warga") dan tetap terbaca di 11px.
- Bobot: 500 untuk judul landing, 600–800 untuk judul panel dan nama tempat, 400 untuk body.
- Skala riil: 84→38 (h1 landing, clamp), 22 (angka panel), 17 (judul panel), 16 (judul kontribusi), 13–14 (body/kontrol), 11–12 (meta), 10 (label kecil minimum).
- Label teknis memakai huruf yang sama dengan `letter-spacing` 0.3–1.1px; tidak ada keluarga mono terpisah.
- Batas bawah: 10px untuk teks yang membawa informasi; di bawah itu hanya dekorasi tanpa makna.

## Palet

Terang (kertas):

| Token | Nilai | Pakai |
|---|---|---|
| `--t-paper` | `#f7f0e4` | latar utama |
| `--t-raised` | `#fffcf6` | kartu, panel terangkat |
| `--t-deep` | `#eee1cd` | bidang sekunder, viewtabs |
| `--t-ink` | `#1b2c35` | teks utama |
| `--t-line` | `#d8c8b2` | garis 1px |
| `--t-stone` | `#6f6557` | teks sekunder (≥5:1 di kertas) |

Aksen dan status:

- `--t-ochre-deep #a95038` dan `--t-brick #b63a2e` untuk aksi utama (rasio ≥4.5:1 dengan teks krem).
- `--t-ochre #d79766` hanya untuk bidang/dot, bukan teks di kertas (2.18:1).
- Status jelajah: selesai `#5e7c64`, mulai `#b07d4f`, belum `#8a8070`, digambar sebagai dot + label.
- Kategori: kafe `#d98a72`, kuliner `#b4553f`, alam `#4f6f5a`, budaya `#3f4d6e`, rekreasi `#c2597b`, lainnya `#847b6b`. Warna ini hanya muncul sebagai dot/tile, tidak pernah sebagai satu-satunya pembeda.

Gelap (panel peta):

- `--t-ink-bg #1b2430`, `--t-ink-card #233040`, teks `#f3ead8`, muted `#b9ae97`, garis `#3a4656`.
- Teks sekunder di panel gelap minimal 4.5:1; `#b9ae97` di `#233040` = 6.1:1.

## Bentuk dan permukaan

- Pill 999px hanya untuk aksi dan filter utama. Kontrol di dalam panel memakai 8–12px agar hierarki terasa, bukan semuanya kapsul.
- Radius panel: 12px kartu, 20px sheet mobile.
- Bayangan hanya untuk lapisan yang benar-benar mengambang (menu akun, sheet). Tidak ada glow.
- Ilustrasi Nusantara memakai gradasi laut aqua dan daratan pasir/sage/terakota dengan butir cat air, bukan blob 3D.

## Pola komponen

- Kicker kecil huruf kapital → judul → lead → aksi. Dipakai di landing, Kontribusi, dan dokumen.
- Panel Explore: coverage (kecamatan, status) → pencarian 44px → chip kategori 44px → filter select 44px → daftar → aksi bawah.
- Tab tampilan (Peta/Daftar/Atlas) memakai `aria-pressed` dengan tinggi 44px, bukan pola tab ARIA.
- Baris destinasi: tile kategori, nama, meta kecamatan, chevron.
- Sheet mobile: peta tetap di atas, sheet di bawah dengan handle, satu baris judul, daftar, aksi.

## Interaksi

- Target sentuh minimum 44×44px di semua kontrol (nav, ikon, tab, chip, select, zoom peta).
- Menu akun dan panel notifikasi: fokus pindah ke panel, Escape atau klik di luar menutup, fokus kembali ke pemicu.
- Dialog memakai `<dialog>` native sehingga Escape dan focus trap bekerja tanpa skrip tambahan.
- `prefers-reduced-motion` mematikan transisi.
- Setiap mode punya keadaan kosong, memuat, gagal, dan sukses yang menyebut apa yang terjadi.

## Peta

- Landing: pertahankan aset cat air asli `public/assets/map/nusantara-watercolor-v2.png`; jangan regenerasi atau sederhanakan artwork. Komposisi mengikuti poster referensi: laut aqua memenuhi viewport, judul dan CTA berada di ruang kertas kiri, intro-skip di kanan atas, label gugus pulau di atas peta, kompas dan keterangan di bawah. Pada ponsel seluruh peta memakai `contain` agar gugus utama tetap tampak.
- Explore Pekanbaru: overlay cat air dipotong ke batas kecamatan (`src/lib/watercolorClip.ts`) memakai kalibrasi di `src/data/pekanbaruWatercolor.ts`. Kertas di luar batas kota harus transparan; area tetangga tetap OSM.
- Batas kecamatan, label, dan stiker selalu di atas ilustrasi.

## Dilarang (diverifikasi tidak terjadi)

- Tidak ada foto tempat, tidak ada gradient ungu/biru dekoratif, tidak ada glassmorphism, glow, atau kartu identik berulang tanpa hierarki.
- Tidak ada angka, testimoni, kontributor, atau nama admin fiktif di UI. Data contoh hanya boleh muncul di rute `#design` dengan label jelas.
- Tidak ada navigasi ke rute yang tidak ada, dan tidak ada kontrol yang tampak interaktif tanpa aksi.
- Tidak ada teks di bawah 4.5:1 untuk teks normal, dan tidak ada em dash di copy antarmuka.
