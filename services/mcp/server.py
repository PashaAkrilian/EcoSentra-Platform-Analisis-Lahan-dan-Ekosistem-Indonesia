"""Entry point MCP server EcoSentra.

Tools didaftarkan di sini (lihat TAHAP 3 untuk get_land_cover).
Dijalankan lewat stdio transport (standar MCP untuk dipanggil sebagai
subprocess oleh aplikasi AI, mis. backend chatbot LandAI).
"""
from dotenv import load_dotenv

load_dotenv()  # muat services/mcp/.env sebelum modul lain baca os.environ

from mcp.server.fastmcp import FastMCP

from tools.land_cover import get_land_cover as _get_land_cover

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


if __name__ == "__main__":
    mcp.run()
