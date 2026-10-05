"""Tool get_land_cover: klasifikasi tutupan lahan berdasarkan koordinat.

Tiga sumber, dipilih otomatis berdasarkan environment variable:
1. ECOSENTRA_API_URL  -> API aplikasi EcoSentra (GET /api/landcover; Esri 10 m atau
   ESA WorldCover kalau aplikasi dikonfigurasi dengan services/geo).
2. LANDCOVER_API_URL  -> langsung ke services/geo (POST /api/landcover) — jalur lama.
3. (keduanya kosong)  -> data MOCK dengan bentuk sama persis, ditandai jelas.
"""
import os

import httpx

from tools.api import ToolError, api_base_url, format_error, get_json

# Angka dari hasil uji nyata layanan geo (area Subang, Jawa Barat) -> mock
# terasa realistis, bukan angka asal-asalan.
MOCK_LANDCOVER_RESPONSE = {
    "dominant_class": "Built-up",
    "classes": [
        {"name": "Built-up", "code": 50, "percentage": 66.78},
        {"name": "Tree cover", "code": 10, "percentage": 23.14},
        {"name": "Cropland", "code": 40, "percentage": 7.75},
        {"name": "Grassland", "code": 30, "percentage": 2.33},
    ],
}


def _format_summary(lat: float, lng: float, buffer_meters: int, data: dict, note: str | None) -> str:
    dominant = data["dominant_class"]
    classes = data["classes"]
    dominant_pct = next((c["percentage"] for c in classes if c["name"] == dominant), None)
    rincian = ", ".join(f"{c['name']} {c['percentage']}%" for c in classes)

    lines = [
        f"Klasifikasi tutupan lahan pada titik ({lat}, {lng}), radius {buffer_meters}m:",
        f"- Kelas dominan: {dominant}" + (f" ({dominant_pct}%)" if dominant_pct is not None else ""),
        f"- Rincian: {rincian}",
    ]
    if note:
        lines += ["", note]
    return "\n".join(lines)


def _validate(lat: float, lng: float, buffer_meters: int) -> str | None:
    # Validasi di sisi MCP dulu -> gagal cepat tanpa panggil jaringan, dan
    # tetap berlaku di mode mock (yang tidak lewat validasi layanan asli).
    if not (-90 <= lat <= 90):
        return f"Error: lat harus di antara -90 dan 90 (input: {lat})."
    if not (-180 <= lng <= 180):
        return f"Error: lng harus di antara -180 dan 180 (input: {lng})."
    if not (100 <= buffer_meters <= 50000):
        return f"Error: buffer_meters harus di antara 100 dan 50000 (input: {buffer_meters})."
    return None


def _from_ecosentra(lat: float, lng: float, buffer_meters: int) -> dict:
    payload = get_json("/api/landcover", {"lat": lat, "lng": lng, "buffer": buffer_meters})
    source = payload.get("source", {})
    return {
        "dominant_class": payload["dominantClass"],
        "classes": payload["classes"],
        "_note": f"Sumber: {source.get('dataset', '?')} {source.get('year', '')} ({source.get('name', 'EcoSentra')}).",
    }


def _from_geo_service(api_url: str, lat: float, lng: float, buffer_meters: int) -> dict:
    try:
        response = httpx.post(
            f"{api_url.rstrip('/')}/api/landcover",
            json={"lat": lat, "lng": lng, "buffer_meters": buffer_meters},
            headers={"X-API-Key": key} if (key := os.environ.get("GEO_API_KEY")) else None,
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()
    except httpx.TimeoutException as exc:
        raise ToolError(f"layanan landcover di {api_url} tidak merespons (timeout). Coba lagi nanti.") from exc
    except httpx.ConnectError as exc:
        raise ToolError(f"tidak bisa terhubung ke layanan landcover di {api_url}. Pastikan layanan sedang berjalan.") from exc
    except httpx.HTTPStatusError as exc:
        raise ToolError(f"layanan landcover mengembalikan status {exc.response.status_code}: {exc.response.text}") from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise ToolError(f"gagal memproses respons dari layanan landcover: {exc}") from exc


def get_land_cover(lat: float, lng: float, buffer_meters: int = 1000) -> str:
    if (problem := _validate(lat, lng, buffer_meters)) is not None:
        return problem

    try:
        if api_base_url():
            data = _from_ecosentra(lat, lng, buffer_meters)
            note = data.pop("_note")
        elif geo_url := os.environ.get("LANDCOVER_API_URL"):
            data = _from_geo_service(geo_url, lat, lng, buffer_meters)
            note = None
        else:
            data = MOCK_LANDCOVER_RESPONSE
            note = "[Catatan: ini data MOCK — ECOSENTRA_API_URL dan LANDCOVER_API_URL belum dikonfigurasi]"
    except ToolError as exc:
        return format_error(exc)

    return _format_summary(lat, lng, buffer_meters, data, note)
