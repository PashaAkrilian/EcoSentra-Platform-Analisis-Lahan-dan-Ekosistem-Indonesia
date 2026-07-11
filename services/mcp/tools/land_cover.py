"""Tool get_land_cover: klasifikasi tutupan lahan berdasarkan koordinat.

Memanggil layanan landcover (services/geo) lewat HTTP kalau
LANDCOVER_API_URL di-set; kalau tidak, kembalikan data MOCK dengan bentuk
yang sama persis (dominant_class + classes[]) supaya AI/tester tidak perlu
tahu bedanya secara struktural.
"""
import os

import httpx

# Angka ini sengaja dipakai dari hasil uji nyata layanan geo (area Subang,
# Jawa Barat) -> mock terasa realistis, bukan angka asal-asalan.
MOCK_LANDCOVER_RESPONSE = {
    "dominant_class": "Built-up",
    "classes": [
        {"name": "Built-up", "code": 50, "percentage": 66.78},
        {"name": "Tree cover", "code": 10, "percentage": 23.14},
        {"name": "Cropland", "code": 40, "percentage": 7.75},
        {"name": "Grassland", "code": 30, "percentage": 2.33},
    ],
}


def _format_summary(lat: float, lng: float, buffer_meters: int, data: dict, is_mock: bool) -> str:
    dominant = data["dominant_class"]
    classes = data["classes"]
    dominant_pct = next((c["percentage"] for c in classes if c["name"] == dominant), None)
    rincian = ", ".join(f"{c['name']} {c['percentage']}%" for c in classes)

    lines = [
        f"Klasifikasi tutupan lahan pada titik ({lat}, {lng}), radius {buffer_meters}m:",
        f"- Kelas dominan: {dominant}" + (f" ({dominant_pct}%)" if dominant_pct is not None else ""),
        f"- Rincian: {rincian}",
    ]
    if is_mock:
        lines += ["", "[Catatan: ini data MOCK — LANDCOVER_API_URL belum dikonfigurasi]"]

    return "\n".join(lines)


def get_land_cover(lat: float, lng: float, buffer_meters: int = 1000) -> str:
    # Validasi di sisi MCP dulu -> gagal cepat tanpa panggil jaringan, dan
    # tetap berlaku di mode mock (yang tidak lewat validasi Pydantic di
    # layanan geo).
    if not (-90 <= lat <= 90):
        return f"Error: lat harus di antara -90 dan 90 (input: {lat})."
    if not (-180 <= lng <= 180):
        return f"Error: lng harus di antara -180 dan 180 (input: {lng})."
    if not (100 <= buffer_meters <= 50000):
        return f"Error: buffer_meters harus di antara 100 dan 50000 (input: {buffer_meters})."

    api_url = os.environ.get("LANDCOVER_API_URL")

    if not api_url:
        return _format_summary(lat, lng, buffer_meters, MOCK_LANDCOVER_RESPONSE, is_mock=True)

    try:
        response = httpx.post(
            f"{api_url.rstrip('/')}/api/landcover",
            json={"lat": lat, "lng": lng, "buffer_meters": buffer_meters},
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()
    except httpx.TimeoutException:
        return f"Error: layanan landcover di {api_url} tidak merespons (timeout). Coba lagi nanti."
    except httpx.ConnectError:
        return f"Error: tidak bisa terhubung ke layanan landcover di {api_url}. Pastikan layanan sedang berjalan."
    except httpx.HTTPStatusError as exc:
        return f"Error: layanan landcover mengembalikan status {exc.response.status_code}: {exc.response.text}"
    except Exception as exc:
        return f"Error: gagal memproses respons dari layanan landcover: {exc}"

    return _format_summary(lat, lng, buffer_meters, data, is_mock=False)
