"""Tool get_ndvi: kehijauan vegetasi (NDVI MODIS) di satu titik."""
from tools.api import ToolError, format_error, get_json


def _describe(ndvi: float) -> str:
    if ndvi < 0.1:
        return "hampir tanpa vegetasi (tanah terbuka, air, atau bangunan)"
    if ndvi < 0.3:
        return "vegetasi jarang atau lahan terbuka"
    if ndvi < 0.5:
        return "vegetasi sedang (semak, tanaman muda, atau lahan pertanian)"
    if ndvi < 0.7:
        return "vegetasi lebat"
    return "vegetasi sangat lebat (mis. hutan tropis rapat)"


def get_ndvi(lat: float, lng: float) -> str:
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return f"Error: koordinat tidak valid (lat={lat}, lng={lng})."

    try:
        data = get_json("/api/ndvi", {"lat": lat, "lng": lng})
    except ToolError as exc:
        return format_error(exc)

    observations = data["observations"]
    cloudy = sum(1 for o in observations if o["quality"] == "berawan")
    latest = data.get("latest")
    if latest is None:
        lines = [f"NDVI di ({data['lat']}, {data['lng']}): semua observasi terbaru tertutup awan, belum ada nilai yang andal."]
    else:
        lines = [
            f"NDVI di ({data['lat']}, {data['lng']}):",
            f"- Terbaru: {latest['ndvi']:.2f} (komposit {latest['date']}) — {_describe(latest['ndvi'])}.",
        ]
    if cloudy:
        lines.append(f"- {cloudy} dari {len(observations)} observasi berawan (tidak andal).")
    source = data["source"]
    lines += ["", f"Sumber: {source['name']} — {source['product']}, {source['resolutionM']} m.", "NDVI menunjukkan kehijauan, bukan diagnosis kesehatan tanaman."]
    return "\n".join(lines)
