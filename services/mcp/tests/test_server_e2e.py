"""Uji ujung-ke-ujung lewat protokol MCP sungguhan: server dijalankan sebagai
subprocess stdio, sementara "aplikasi EcoSentra" dipalsukan oleh HTTP server lokal."""
import asyncio
import json
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import pytest

pytest.importorskip("mcp")

from mcp import ClientSession, StdioServerParameters  # noqa: E402
from mcp.client.stdio import stdio_client  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent

QUAKES = {
    "source": {"name": "BMKG", "fetchedAt": "2026-10-05T14:00:00Z"},
    "recent": [{"magnitude": 5.9, "region": "68 km BaratDaya CALANG-ACEHJAYA", "occurredAt": "2026-10-03T23:37:31Z", "depthKm": 26, "tsunamiPotential": False, "felt": None}],
    "felt": [],
}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        if self.path.startswith("/api/earthquakes"):
            body = json.dumps(QUAKES).encode()
            self.send_response(200)
        else:
            body = b'{"error": "tidak ada"}'
            self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass


@pytest.fixture
def fake_app():
    server = HTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_address[1]}"
    server.shutdown()


async def _call(url: str, tool: str, args: dict) -> tuple[list[str], str]:
    params = StdioServerParameters(
        command=sys.executable,
        args=["server.py"],
        cwd=str(ROOT),
        env={"ECOSENTRA_API_URL": url, "PATH": "/usr/bin:/bin"},
    )
    async with stdio_client(params) as (read, write), ClientSession(read, write) as session:
        await session.initialize()
        names = [t.name for t in (await session.list_tools()).tools]
        result = await session.call_tool(tool, args)
        return names, "".join(c.text for c in result.content if hasattr(c, "text"))


def test_tools_are_registered_and_callable_over_stdio(fake_app):
    names, text = asyncio.run(asyncio.wait_for(_call(fake_app, "get_earthquakes", {"limit": 1}), timeout=60))
    assert set(names) == {"get_land_cover", "get_fire_hotspots", "get_earthquakes", "get_weather", "get_ndvi"}
    assert "M 5.9 · 68 km BaratDaya CALANG-ACEHJAYA" in text
    assert "Sumber: BMKG" in text


def test_upstream_error_is_reported_as_text(fake_app):
    _, text = asyncio.run(asyncio.wait_for(_call(fake_app, "get_ndvi", {"lat": -6.5, "lng": 107.7}), timeout=60))
    assert text.startswith("Error: EcoSentra mengembalikan status 404")
