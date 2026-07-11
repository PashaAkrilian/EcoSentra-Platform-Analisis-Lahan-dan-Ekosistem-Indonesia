"""Entry point MCP server EcoSentra.

Tools didaftarkan di sini (lihat TAHAP 3 untuk get_land_cover).
Dijalankan lewat stdio transport (standar MCP untuk dipanggil sebagai
subprocess oleh aplikasi AI, mis. backend chatbot LandAI).
"""
from dotenv import load_dotenv

load_dotenv()  # muat services/mcp/.env sebelum modul lain baca os.environ

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("ecosentra-mcp")

if __name__ == "__main__":
    mcp.run()
