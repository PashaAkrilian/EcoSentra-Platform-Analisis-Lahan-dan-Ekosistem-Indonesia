"""Entry point MCP server EcoSentra.

Mengekspos data lahan & ekosistem Indonesia sebagai tool untuk asisten AI
(Claude Desktop, LandAI, dst.). Dijalankan lewat stdio transport (standar MCP
untuk dipanggil sebagai subprocess oleh aplikasi AI).

Konfigurasi (lihat .env.example): ECOSENTRA_API_URL mengarah ke aplikasi
EcoSentra (apps/web); semua tool mengambil data nyata lewat API itu.
"""
from dotenv import load_dotenv

try:  # mcp >= 2: FastMCP diganti nama menjadi MCPServer
    from mcp.server.mcpserver import MCPServer as FastMCP
except ImportError:  # mcp 1.x
    from mcp.server.fastmcp import FastMCP

from tools.earthquakes import get_earthquakes as _get_earthquakes
from tools.hotspots import get_fire_hotspots as _get_fire_hotspots
from tools.land_cover import get_land_cover as _get_land_cover
from tools.ndvi import get_ndvi as _get_ndvi
from tools.weather import get_weather as _get_weather

load_dotenv()  # muat services/mcp/.env; konfigurasi dibaca dari os.environ saat tool dipanggil

mcp = FastMCP("ecosentra-mcp")


@mcp.tool()
def get_land_cover(lat: float, lng: float, buffer_meters: int = 1000) -> str:
    """Klasifikasi tutupan lahan (land cover) di sekitar sebuah koordinat.

    Args:
        lat: Latitude titik pusat (-90 sampai 90).
        lng: Longitude titik pusat (-180 sampai 180).
        buffer_meters: Radius area yang dianalisis dalam meter (100-50000, default 1000).
    """
    return _get_land_cover(lat, lng, buffer_meters)


@mcp.tool()
def get_fire_hotspots(province: str | None = None, range: str = "24h") -> str:  # noqa: A002
    """Jumlah titik api (anomali panas satelit NASA FIRMS) di Indonesia.

    Titik api BUKAN kebakaran terverifikasi.

    Args:
        province: Nama provinsi (mis. "Kalimantan Tengah" atau "Kalteng"); kosong = seluruh Indonesia.
        range: Rentang waktu: "24h" (default), "48h", atau "7d".
    """
    return _get_fire_hotspots(province, range)


@mcp.tool()
def get_earthquakes(limit: int = 5, felt: bool = False) -> str:
    """Gempa bumi terbaru dari BMKG.

    Args:
        limit: Jumlah gempa yang ditampilkan (1-15, default 5).
        felt: True = gempa yang dirasakan warga; False (default) = gempa M 5.0+ terbaru.
    """
    return _get_earthquakes(limit, felt)


@mcp.tool()
def get_weather(lat: float, lng: float) -> str:
    """Cuaca terkini dan prakiraan beberapa hari untuk satu koordinat di Indonesia (Open-Meteo).

    Args:
        lat: Latitude (-90 sampai 90).
        lng: Longitude (-180 sampai 180).
    """
    return _get_weather(lat, lng)


@mcp.tool()
def get_ndvi(lat: float, lng: float) -> str:
    """Kehijauan vegetasi (NDVI, NASA MODIS 250 m) terbaru di satu koordinat; observasi berawan ditandai tidak andal.

    Args:
        lat: Latitude (-90 sampai 90).
        lng: Longitude (-180 sampai 180).
    """
    return _get_ndvi(lat, lng)


if __name__ == "__main__":
    mcp.run()
