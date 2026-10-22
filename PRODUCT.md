# PRODUCT — Tapeta

**Nama:** Tapeta
**Tagline:** Temukan tempat, bagikan cerita.
**Definisi satu kalimat:** peta eksplorasi kota yang menjawab dengan cepat, dalam satu layar, tempat apa yang ada di kecamatan ini dan kecamatan mana yang masih perlu dijelajahi.

## Momen akar
Peta web biasa menunjukkan titik-titik dan menyerahkan kerangka wilayah ke Google Maps. Tapeta membuat batas kecamatan jadi unit utama: status jelajah diukur per wilayah nyata (OpenStreetMap), bukan diklaim.

## Audiens
1. **Penjelajah** — warga, pendatang, atau pelancong yang menemukan tempat dan melihat sebaran wilayah.
2. **Kontributor** — orang yang kelak mengusulkan destinasi baru.
3. **Admin verifikator** — pihak yang memberi status jelajah.

## Keputusan produk yang mengikat semua permukaan
- Bahasa antarmuka: Indonesia.
- Palet: krem kertas, merah maroon/bata sebagai warna primer, hijau/teal, ink, dan aksen sakura. Putih sementara warna dukungan.
- Status jelajah per kecamatan memakai kalimat persis:
  - `0` destinasi = Belum dijelajah
  - `1–4` = Sedang dijelajah
  - `>=5` = Sudah dijelajah
- Tempat yang belum terverifikasi harus terlihat jelas; tidak boleh berpura-pura sudah verifikasi.
- Atribusi OpenStreetMap wajib terlihat.
- Dilarang: tumpuk-tumpuk efek kaca/glossy, sfumato palsu, fake-map seolah Indonesia terlihat di web, gambar manapun yang tidak bisa dibuktikan sumbernya.
- Bahasa desain diperbolehkan: pola titik (dot grid) di atas krem, pill/komponen tegas, garis peta tipis, dan kheri artikel (cover koordinat) sebagai ganti foto yang tidak sah.

## Ruang lingkup prototipe
- Seluruh Indonesia untuk batas kota/kabupaten (OpenStreetMap via Nominatim + Overpass); Pekanbaru untuk katalog destinasi contoh.
- Web React + Vite; ikon garis inline sederhana.

Rincian lengkap ada di `PRD.md`.
