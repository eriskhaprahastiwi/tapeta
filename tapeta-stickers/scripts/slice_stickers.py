from PIL import Image, ImageFilter
import json, os, re, unicodedata

SRC = "ChatGPT Image Oct 20, 2026, 07_19_13 PM.png"
OUT = "tapeta-stickers/assets/stickers"
COLS, ROWS = 5, 6

LABELS = [
    ["Asia Heritage", "Asia Farm Pekanbaru", "Taman Alam Mayang", "Danau Bandar Khayangan", "Taman Wisata Okura"],
    ["Museum Daerah Riau Sang Nila Utama", "Masjid Raya An-Nur", "Perpustakaan Soeman H.S.", "Anjung Seni Idrus Tintin", "Rumah Singgah Tuan Kadi"],
    ["Kampung Bandar", "Masjid Senapelan", "Balai Adat Melayu Riau", "Tugu Zapin", "Jembatan Siak IV"],
    ["Jembatan Siak I", "Pasar Bawah", "Pasar Cik Puan", "Kawasan Sungai Siak", "Kantor Wali Kota Pekanbaru Tenayan Raya"],
    ["Kebun Binatang Kasang Kulim", "Rainbow Hills", "Taman Kaca Mayang", "Taman Labuai", "Living World Pekanbaru"],
    ["Mal SKA", "Mall Pekanbaru", "Transmart Pekanbaru", "Ciputra Seraya Mall", "Plaza Senapan"],
]

def slug(text):
    text = text.replace("H.S.", "HS")
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()

def art_bottom(cell):
    w, h = cell.size
    px = cell.convert("RGB").load()
    rows = []
    for y in range(h):
        xs = [x for x in range(w) if min(px[x, y]) < 200]
        rows.append((len(xs), (max(xs) - min(xs)) if xs else 0))
    groups, start = [], None
    for y, (n, width) in enumerate(rows):
        if n > 4 and start is None:
            start = y
        if n <= 4 and start is not None:
            groups.append((start, y - 1)); start = None
    if start is not None:
        groups.append((start, h - 1))
    groups = [g for g in groups if g[1] - g[0] >= 4]
    if len(groups) >= 2:
        last = groups[-1]
        if last[0] > h * 0.55 and rows[(last[0] + last[1]) // 2][1] < w * 0.8:
            return max(0, last[0] - 4)
    return int(h * 0.82)

img = Image.open(SRC).convert("RGBA")
W, H = img.size
cw, ch = W / COLS, H / ROWS
manifest = []

for r in range(ROWS):
    for c in range(COLS):
        label = LABELS[r][c]
        x0, y0 = int(c * cw), int(r * ch)
        x1 = int((c + 1) * cw)
        full = img.crop((x0, y0, x1, int((r + 1) * ch))).convert("RGB")
        cut = art_bottom(full)
        cell = full.crop((0, 0, x1 - x0, cut))

        px = cell.load()
        w, h = cell.size
        mask = Image.new("L", (w, h), 0)
        mp = mask.load()
        for y in range(h):
            for x in range(w):
                rr, gg, bb = px[x, y]
                if min(rr, gg, bb) < 244 or max(rr, gg, bb) - min(rr, gg, bb) > 6:
                    mp[x, y] = 255

        mask = mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(1.0))
        bbox = mask.getbbox()
        if not bbox:
            print("empty", label)
            continue

        pad = 3
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad))
        art = cell.convert("RGBA").crop(bbox)
        alpha = mask.crop(bbox)
        art.putalpha(alpha)

        name = slug(label) + ".png"
        art.save(os.path.join(OUT, name))
        manifest.append({"file": name, "label": label, "row": r, "col": c, "w": art.width, "h": art.height})

with open("tapeta-stickers/data/stickers.json", "w") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

print(f"{len(manifest)} stickers -> {OUT}")
for m in manifest:
    print(f"{m['file']:55} {m['w']}x{m['h']}")
