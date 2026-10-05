"""Tool get_weather: cuaca terkini + prakiraan 7 hari (Open-Meteo via EcoSentra)."""
from tools.api import ToolError, format_error, get_json


def get_weather(lat: float, lng: float) -> str:
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return f"Error: koordinat tidak valid (lat={lat}, lng={lng})."

    try:
        data = get_json("/api/weather", {"lat": lat, "lng": lng})
    except ToolError as exc:
        return format_error(exc)

    c = data["current"]
    lines = [
        f"Cuaca di ({data['lat']}, {data['lng']}):",
        f"- Sekarang: {c['description']}, {c['temperatureC']}°C, kelembapan {c['humidityPct']}%, angin {c['windSpeedKmh']} km/j, hujan {c['precipitationMm']} mm.",
    ]
    if c.get("soilMoisture") is not None:
        lines.append(f"- Kelembapan tanah (model): {round(c['soilMoisture'] * 100, 1)}%.")
    lines.append("- Prakiraan: " + "; ".join(f"{d['date']} {d['description'].lower()} {round(d['tempMinC'])}–{round(d['tempMaxC'])}°C, hujan {d['precipitationMm']} mm" for d in data["daily"][:5]) + ".")
    lines += ["", f"Sumber: {data['source']['name']}. Kelembapan tanah adalah keluaran model, bukan pengukuran lapangan."]
    return "\n".join(lines)
