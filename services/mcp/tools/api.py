"""Klien HTTP ke API EcoSentra (apps/web): satu tempat untuk URL dasar,
timeout, dan pemetaan galat jadi pesan yang jelas (tool MCP tidak pernah crash)."""
import os

import httpx

TIMEOUT_SECONDS = 60.0  # data satelit (mis. CSV FIRMS, ORNL) bisa lambat saat cache dingin


class ToolError(Exception):
    """Galat yang pesannya aman ditampilkan ke model/pengguna apa adanya."""


def api_base_url() -> str | None:
    url = os.environ.get("ECOSENTRA_API_URL", "").strip()
    return url.rstrip("/") if url else None


def require_api_base_url(tool: str) -> str:
    url = api_base_url()
    if not url:
        raise ToolError(
            f"Tool {tool} membutuhkan ECOSENTRA_API_URL (URL aplikasi EcoSentra, mis. "
            "http://localhost:8080). Tool ini sengaja tidak punya mode mock supaya tidak "
            "menyajikan data palsu."
        )
    return url


def get_json(path: str, params: dict | None = None) -> dict:
    """GET {ECOSENTRA_API_URL}{path} dan kembalikan JSON-nya; galat -> ToolError."""
    base = require_api_base_url(path)
    clean = {k: v for k, v in (params or {}).items() if v is not None}
    try:
        response = httpx.get(f"{base}{path}", params=clean, timeout=TIMEOUT_SECONDS)
    except httpx.TimeoutException as exc:
        raise ToolError(f"layanan EcoSentra di {base} tidak merespons (timeout). Coba lagi nanti.") from exc
    except httpx.ConnectError as exc:
        raise ToolError(f"tidak bisa terhubung ke EcoSentra di {base}. Pastikan aplikasi sedang berjalan.") from exc
    except httpx.HTTPError as exc:
        raise ToolError(f"permintaan ke EcoSentra gagal: {exc}") from exc

    if response.status_code >= 400:
        try:
            detail = response.json().get("error", "")
        except ValueError:
            detail = ""
        raise ToolError(f"EcoSentra mengembalikan status {response.status_code}" + (f": {detail}" if detail else "."))

    try:
        return response.json()
    except ValueError as exc:
        raise ToolError("respons EcoSentra bukan JSON yang valid.") from exc


def format_error(exc: ToolError) -> str:
    return f"Error: {exc}"
