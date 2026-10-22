# DESIGN.md — Tapeta

Bahasa desain hasil pembangunan (bukan asumsi): semua nilai di bawah terekstrak dari kode yang berjalan (`src/index.css`, komponen `Landing`, `PekanbaruIllustration`, `CoverArt`, `StatusMark`). Diagram komponen ada di `public/reference/`.

## Selera dunia

Kertas adalah kota: layar terasa seperti atlas krem yang bisa dijelajahi — dokumen cetak yang hidup dengan pola titik, garis tipis, dan pill tegas. Dua rezim permukaan: **kertas terang** (beranda, sidebar app) dan **panel tinta gelap** (showcase peta di beranda). Tidak ada foto tempat; "gambar" digantikan ilustrasi koordinat (CoverArt) dan poligon kecamatan nyata dari OpenStreetMap. Segala angka di layar adalah hitungan nyata dari data terbit, dan setiap kanvas data menyebut sumbernya (© OpenStreetMap).

## Karakter tipografis

- Display: **Bricolage Grotesque Variable** — judul berat 620–640, tracking −0.02em sampai −0.035em, line-height 0.99–1.2, `text-wrap: balance`.
- Body: **Instrument Sans** 14–16.5px, line-height 1.5–1.65.
- Mono (data/label teknis): **IBM Plex Mono** 9–15px, uppercase + letter-spacing 0.08–0.16em untuk kicker, label peta, dan angka.
- Skala aktif: 82→44 (h1 clamp), 34 (h2 gelap), 32 (angka status), 21, 16.5, 14.5, 12.5, 10.

## Palet

Terang (kertas): `--paper #f4eee2`, `--paper-raised #fbf7ee`, `--paper-deep #ebe2d3`, `--ink #23241f`.
Aksi & status: `--ochre #d98a72`, `--ochre-deep #a64e38`, `--brick #b4553f`, `--forest #4f6f5a`, `--sakura #e8c6cc`, `--stone #b4aa9b`/`#847b6b`.
Gelap (panel showcase): background `--ink #23241f`, teks `#f1ece1`/`#f6f1e6`, aksen sakura, garis putih ⍺0.12–0.4.
Warna kategori pin (landing): kafe `#d98a72`, kuliner `#b4553f`, alam `#4f6f5a`, budaya `#3f4d6e`, rekreasi `#c2597b`, lainnya `#847b6b`.
Status jelajah: explored = forest solid; in-progress = ochre setengah; unexplored = garis putus-putus (di gelap: putih ⍺0.55).

## Bentuk, garis, bayangan

- Pill penuh (99px) untuk CTA/tombol; 10–12px untuk toggle/input/kartu; 24px untuk kartu peta hero.
- Garis 1px `--line #d9d0bf` / `--line-strong #b8ad9a`; di panel gelap pakai putih transparan.
- Bayangan hanya untuk elevasi nyata: kartu peta hero `0 24px 50px rgba(35,36,31,.09)`, featured bar `0 -8px 24px`; tanpa glow.
- Tekstur: halftone titik via `radial-gradient(var(--line) 1.05px, transparent 1.05px)` size 14–15px — dipakai pada kanvas peta krem.

## Pola komponen berulang

- Kicker mono uppercase maroon (terang) / sakura (gelap) → judul display → lead → CTA pair (primary pill maroon + ghost outline).
- Angka besar + label kecil (status bar: Sudah 1 / Sedang 11 / Belum dijelajah 3) dengan warna status.
- Toggle lapisan: grid 2 kolom, dot warna kategori + nama + count mono, keadaan off = dashed + opasitas 0.42.
- Baris status legend: dot 10px + label + count mono kanan.
- Strip "Lokasi Terdepan": kartu CoverArt 198px (caption disembunyikan), nama display 14.5, region mono uppercase 10px; hover naik 2px.
- Label peta: mono 15px dengan stroke krem 3.5px agar terbaca di atas poligon.
- Kanvas peta SVG `PekanbaruIllustration` viewBox 1000×961, poligon `#efe6d4` + stroke `#c3b8a3`, animasi bloom berurutan 480ms (delay 55ms/region), pins dengan ring ⍺0.22 dan dot warna kategori.

## Interaksi khas

- Setiap tindakan primer biru-beku dijelaskan nomornya: "Buka peta interaktif", "Buka peta", tombol lapisan punya hitungan nyata.
- Toggle kategori dan pencarian bekerja di beranda dan memindahkan state ke app (bukan hiasan); klik kartu terdepan membuka detail destinasi di app.
- Kembali: tombol brand di app kembali ke beranda.

## Dilarang (yang sudah diuji tidak terjadi)

- Tidak ada foto/gambar tempat; tak ada gradient dekoratif; tak ada kaca/glossy; tak ada glow; tak ada judul ALL-CAPS di teks body (mono uppercase hanya kicker/label).
- Tidak ada klaim verifikasi palsu: footer menyatakan status dihitung dari data terbit, bukan jaminan tempat masih buka.
