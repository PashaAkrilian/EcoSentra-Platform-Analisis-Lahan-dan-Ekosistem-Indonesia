"""Tool get_earthquakes: gempa terbaru dari BMKG."""
from tools.api import ToolError, format_error, get_json


def get_earthquakes(limit: int = 5, felt: bool = False) -> str:
    if not (1 <= limit <= 15):
        return f"Error: limit harus di antara 1 dan 15 (input: {limit})."

    try:
        data = get_json("/api/earthquakes")
    except ToolError as exc:
        return format_error(exc)

    events = (data["felt"] if felt else data["recent"])[:limit]
    if not events:
        return "Tidak ada data gempa dari BMKG saat ini."

    lines = [f"Gempa bumi terbaru{' yang dirasakan' if felt else ' (M 5.0+)'} — BMKG:"]
    for q in events:
        extras = [f"kedalaman {q['depthKm']} km"]
        if q.get("tsunamiPotential"):
            extras.append("BERPOTENSI TSUNAMI")
        if q.get("felt"):
            extras.append(f"dirasakan {q['felt']}")
        lines.append(f"- M {q['magnitude']:.1f} · {q['region']} · {q['occurredAt']} (UTC) · {' · '.join(extras)}")
    lines += ["", f"Sumber: {data['source']['name']}, diambil {data['source']['fetchedAt']}.", "Bukan peringatan dini resmi; rujuk BMKG/BNPB untuk keputusan keselamatan."]
    return "\n".join(lines)
