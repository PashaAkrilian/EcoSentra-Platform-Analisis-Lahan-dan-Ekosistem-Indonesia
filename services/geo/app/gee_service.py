"""Logika Google Earth Engine untuk klasifikasi tutupan lahan.

Dipisah dari routing (main.py) supaya main.py hanya berisi HTTP concern,
sedangkan semua interaksi GEE (init, query, transformasi data) ada di sini.
"""
import json
import os
import tempfile

import ee

WORLDCOVER_ASSET_ID = "ESA/WorldCover/v200"
WORLDCOVER_BAND = "Map"

# Referensi: https://esa-worldcover.org/en/data-access — 11 kelas ESA WorldCover v200.
CODE_TO_NAME = {
    10: "Tree cover",
    20: "Shrubland",
    30: "Grassland",
    40: "Cropland",
    50: "Built-up",
    60: "Bare / sparse vegetation",
    70: "Snow and ice",
    80: "Permanent water bodies",
    90: "Herbaceous wetland",
    95: "Mangroves",
    100: "Moss and lichen",
}


class GEEServiceError(Exception):
    """Error saat berinteraksi dengan Google Earth Engine (dibungkus jadi pesan jelas)."""


_initialized = False


def _ensure_initialized() -> None:
    """Inisialisasi GEE sekali saja per proses (mirip pola singleton di
    apps/web/server/firebaseAdmin.ts: `if (!admin.apps.length)`)."""
    global _initialized
    if _initialized:
        return

    service_account = os.environ.get("GEE_SERVICE_ACCOUNT")
    key_path = os.environ.get("GEE_KEY_PATH")
    credentials_json = os.environ.get("GEE_CREDENTIALS_JSON")

    try:
        if credentials_json:
            # Jalur deploy (mis. Hugging Face Spaces/Railway): tidak ada file
            # persisten, jadi isi JSON dari secret env var ditulis ke file
            # sementara dulu karena ee.ServiceAccountCredentials butuh path file.
            if not service_account:
                service_account = json.loads(credentials_json).get("client_email")
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False
            ) as tmp_key_file:
                tmp_key_file.write(credentials_json)
                key_path = tmp_key_file.name
        elif not key_path:
            raise GEEServiceError(
                "GEE_KEY_PATH atau GEE_CREDENTIALS_JSON wajib di-set "
                "(lihat .env.example)."
            )

        if not service_account:
            raise GEEServiceError("GEE_SERVICE_ACCOUNT wajib di-set.")

        credentials = ee.ServiceAccountCredentials(service_account, key_path)
        ee.Initialize(credentials)
    except GEEServiceError:
        raise
    except Exception as exc:
        raise GEEServiceError(f"Gagal inisialisasi Google Earth Engine: {exc}") from exc

    _initialized = True


def get_landcover_breakdown(lat: float, lng: float, buffer_meters: int) -> dict:
    """Ambil breakdown kelas tutupan lahan dalam radius `buffer_meters` dari
    titik (lat, lng), memakai dataset ESA WorldCover v200."""
    _ensure_initialized()

    try:
        point = ee.Geometry.Point([lng, lat])
        region = point.buffer(buffer_meters)

        # ESA/WorldCover/v200 adalah ImageCollection berisi satu Image (mosaic
        # global), bukan Image langsung — harus diambil lewat .first().
        image = ee.ImageCollection(WORLDCOVER_ASSET_ID).first().select(WORLDCOVER_BAND)

        histogram = image.reduceRegion(
            reducer=ee.Reducer.frequencyHistogram(),
            geometry=region,
            scale=10,
            maxPixels=1e9,
            bestEffort=True,  # kalau area terlalu besar, GEE otomatis perkasar scale-nya
        ).get(WORLDCOVER_BAND)

        histogram_dict = ee.Dictionary(histogram).getInfo()
    except Exception as exc:
        raise GEEServiceError(f"Gagal mengambil data dari Google Earth Engine: {exc}") from exc

    if not histogram_dict:
        raise GEEServiceError("Tidak ada data tutupan lahan pada area ini.")

    total_pixels = sum(histogram_dict.values())
    classes = []
    for code_str, count in histogram_dict.items():
        code = int(code_str)
        percentage = round((count / total_pixels) * 100, 2)
        classes.append(
            {
                "name": CODE_TO_NAME.get(code, f"Unknown ({code})"),
                "code": code,
                "percentage": percentage,
            }
        )

    classes.sort(key=lambda c: c["percentage"], reverse=True)

    return {"dominant_class": classes[0]["name"], "classes": classes}
