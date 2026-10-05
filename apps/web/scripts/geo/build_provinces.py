"""Bangun server/geo/indonesia-provinces.json dari geoBoundaries IDN ADM1.

Dipakai untuk memfilter titik api FIRMS ke wilayah Indonesia dan menghitung
jumlahnya per provinsi (lihat server/geo/indonesia.ts).

Jalankan ulang hanya kalau ingin memperbarui/mengganti sumber batas wilayah:

    python3 -m venv /tmp/geo-venv && /tmp/geo-venv/bin/pip install shapely
    curl -L -o /tmp/idn_adm1.geojson \
      https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IDN/ADM1/geoBoundaries-IDN-ADM1_simplified.geojson
    /tmp/geo-venv/bin/python scripts/geo/build_provinces.py /tmp/idn_adm1.geojson

Sumber: geoBoundaries gbOpen IDN ADM1 (OpenStreetMap, tahun 2017, 34 provinsi),
lisensi ODbL 1.0 — hasil turunan ini juga berlisensi ODbL (lihat
server/geo/README.md).
"""
import json
import math
import sys
from pathlib import Path

from shapely.geometry import MultiPolygon, Polygon, shape

TOLERANCE_DEG = 0.005  # ~550 m — selisih klasifikasi titik api vs data asli < 0.1%
MIN_ISLET_AREA_DEG2 = 0.0001  # ~1.2 km² — pulau sangat kecil dibuang
PRECISION = 4  # ~11 m

WEB_ROOT = Path(__file__).resolve().parents[2]
OUTPUT = WEB_ROOT / "server" / "geo" / "indonesia-provinces.json"
# Meta ringan per provinsi (kotak pembatas + luas), aman dipakai di klien:
# zoom peta saat memilih provinsi & menghitung kepadatan titik api.
META_OUTPUT = WEB_ROOT / "lib" / "province-meta.json"


EARTH_RADIUS_KM = 6371.0088


def ring_area_km2(coords) -> float:
    """Luas ring (derajat WGS84) memakai proyeksi Lambert cylindrical equal-area
    (x = R·λ, y = R·sin φ) — luas dipertahankan persis pada bumi bola."""
    pts = [(math.radians(x) * EARTH_RADIUS_KM, math.sin(math.radians(y)) * EARTH_RADIUS_KM) for x, y in coords]
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]))) / 2


def polygon_area_km2(polygon: Polygon) -> float:
    return ring_area_km2(polygon.exterior.coords) - sum(ring_area_km2(i.coords) for i in polygon.interiors)


def flatten_ring(coords) -> list[float]:
    flat: list[float] = []
    for x, y in coords:
        flat += [round(x, PRECISION), round(y, PRECISION)]
    return flat


def main(src: str) -> None:
    data = json.loads(Path(src).read_text())
    provinces = []
    for feature in data["features"]:
        iso = feature["properties"]["shapeISO"]
        geom = shape(feature["geometry"]).simplify(TOLERANCE_DEG, preserve_topology=True)
        parts = list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]
        # Luas dihitung SEBELUM pulau kecil dibuang, supaya total tetap akurat.
        area_km2 = sum(polygon_area_km2(p) for p in parts)
        parts = [p for p in parts if p.area >= MIN_ISLET_AREA_DEG2]
        polygons = [
            [flatten_ring(p.exterior.coords)] + [flatten_ring(i.coords) for i in p.interiors] for p in parts
        ]
        minx, miny, maxx, maxy = MultiPolygon(parts).bounds
        provinces.append(
            {
                "iso": iso,
                "areaKm2": round(area_km2),
                "bbox": [round(minx, PRECISION), round(miny, PRECISION), round(maxx, PRECISION), round(maxy, PRECISION)],
                "polygons": polygons,
            }
        )

    provinces.sort(key=lambda p: p["iso"])
    output = {
        "source": "geoBoundaries gbOpen IDN ADM1 (OpenStreetMap, 2017), ODbL 1.0",
        "simplifiedToleranceDeg": TOLERANCE_DEG,
        "provinces": provinces,
    }
    OUTPUT.write_text(json.dumps(output, separators=(",", ":")))
    META_OUTPUT.write_text(
        json.dumps({p["iso"]: {"bbox": p["bbox"], "areaKm2": p["areaKm2"]} for p in provinces}, separators=(",", ":")) + "\n"
    )
    total = sum(p["areaKm2"] for p in provinces)
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size / 1024:.0f} KB, {len(provinces)} provinsi, total {total:,} km²)")


if __name__ == "__main__":
    main(sys.argv[1])
