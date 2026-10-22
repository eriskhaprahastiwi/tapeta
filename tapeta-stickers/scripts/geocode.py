import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "nominatim"
OUT.mkdir(parents=True, exist_ok=True)

QUERIES = {
    "asia-heritage": "Asia Heritage Pekanbaru",
    "asia-farm-pekanbaru": "Asia Farm Pekanbaru",
    "taman-alam-mayang": "Taman Alam Mayang Pekanbaru",
    "taman-wisata-okura": "Taman Wisata Okura Pekanbaru",
    "perpustakaan-soeman-hs": "Perpustakaan Soeman HS Pekanbaru",
    "anjung-seni-idrus-tintin": "Anjung Seni Idrus Tintin Pekanbaru",
    "rumah-singgah-tuan-kadi": "Rumah Singgah Tuan Kadi Pekanbaru",
    "kampung-bandar": "Kampung Bandar Pekanbaru",
    "masjid-senapelan": "Masjid Senapelan Pekanbaru",
    "balai-adat-melayu-riau": "Balai Adat Melayu Riau Pekanbaru",
    "jembatan-siak-i": "Jembatan Siak I Pekanbaru",
    "pasar-cik-puan": "Pasar Cik Puan Pekanbaru",
    "kawasan-sungai-siak": "Sungai Siak Pekanbaru",
    "kantor-wali-kota-pekanbaru-tenayan-raya": "Kantor Walikota Pekanbaru Tenayan Raya",
    "kebun-binatang-kasang-kulim": "Kebun Binatang Kasang Kulim",
    "rainbow-hills": "Rainbow Hills Pekanbaru",
    "taman-kaca-mayang": "Taman Kaca Mayang Pekanbaru",
    "taman-labuai": "Taman Labuai Pekanbaru",
    "mal-ska": "Mal SKA Pekanbaru",
    "mall-pekanbaru": "Mall Pekanbaru",
    "transmart-pekanbaru": "Transmart Pekanbaru",
    "ciputra-seraya-mall": "Ciputra Seraya Mall Pekanbaru",
    "plaza-senapan": "Plaza Senapelan Pekanbaru",
}

headers = {"User-Agent": "TAPETA-map-research/0.1 (design prototype; contact: local)"}
for slug, query in QUERIES.items():
    path = OUT / f"{slug}.json"
    if path.exists():
        continue
    params = {
        "q": query,
        "format": "jsonv2",
        "addressdetails": 1,
        "extratags": 1,
        "limit": 6,
        "countrycodes": "id",
        "viewbox": "101.20,0.75,101.70,0.30",
        "bounded": 0,
    }
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            data = json.load(res)
        path.write_text(json.dumps(data, indent=1))
        top = data[0] if data else None
        print(slug, "->", len(data), "|", top and f"{top['display_name']} [{top['lat']},{top['lon']}] {top['osm_type']}/{top['osm_id']}")
    except Exception as exc:
        print(slug, "FAILED", exc)
    time.sleep(1.1)
