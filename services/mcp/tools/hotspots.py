"""Tool get_fire_hotspots: jumlah titik api (NASA FIRMS) nasional atau per provinsi."""
from tools.api import ToolError, format_error, get_json

RANGES = {"24h": "24 jam terakhir", "48h": "48 jam terakhir", "7d": "7 hari terakhir"}


def _n(value: int) -> str:
    """Angka dengan pemisah ribuan titik (format Indonesia): 3079 -> 3.079."""
    return f"{value:,}".replace(",", ".")


def get_fire_hotspots(province: str | None = None, range: str = "24h") -> str:  # noqa: A002 - nama param mengikuti API
    if range not in RANGES:
        return f"Error: range harus salah satu dari {', '.join(RANGES)} (input: {range!r})."

    try:
        data = get_json("/api/hotspots/summary", {"range": range, "province": province or None})
    except ToolError as exc:
        return format_error(exc)

    scope = data["byProvince"][0]["name"] if province and data["byProvince"] else (province or "Seluruh Indonesia")
    lines = [
        f"Titik api — {scope} ({RANGES[range]}):",
        f"- Total: {_n(data['total'])} titik, {_n(data['highConfidence'])} berkeyakinan tinggi.",
    ]
    if data.get("latestAcquiredAt"):
        lines.append(f"- Deteksi terbaru: {data['latestAcquiredAt']} (UTC).")
    if not province and data["byProvince"]:
        top = ", ".join(f"{p['name']} ({_n(p['count'])})" for p in data["byProvince"][:5])
        lines.append(f"- Provinsi terbanyak: {top}.")
    if range == "7d" and data.get("byDay"):
        lines.append("- Per hari (WIB): " + ", ".join(f"{d['date']}: {d['count']}" for d in data["byDay"]) + " (hari pertama & terakhir belum lengkap).")
    source = data["source"]
    lines += ["", f"Sumber: {source['name']} — {source['satellite']}, diambil {source['fetchedAt']}.", "Catatan: titik api adalah anomali panas satelit, bukan kebakaran terverifikasi."]
    return "\n".join(lines)
