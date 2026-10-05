# services/mcp — EcoSentra MCP Server

[MCP](https://modelcontextprotocol.io) server yang mengekspos data EcoSentra sebagai **tool**
untuk asisten AI eksternal (Claude Desktop dan klien MCP lain). Semua tool memanggil API aplikasi
EcoSentra (`apps/web`), sehingga angkanya identik dengan dashboard.

> LandAI di dalam aplikasi web **tidak** memakai server ini (ia memanggil modul data yang sama
> secara langsung). MCP server ada untuk asisten di luar aplikasi.

## Tool

| Tool | Parameter | Isi |
|---|---|---|
| `get_fire_hotspots` | `province?` (nama/singkatan), `range` = `24h`\|`48h`\|`7d` | jumlah titik api (NASA FIRMS), provinsi teratas, per hari |
| `get_earthquakes` | `limit` (1–15), `felt` | gempa M 5+ terbaru atau gempa dirasakan (BMKG), potensi tsunami |
| `get_weather` | `lat`, `lng` | cuaca terkini, prakiraan, kelembapan tanah (model) |
| `get_ndvi` | `lat`, `lng` | NDVI terbaru yang andal + tafsir; observasi berawan ditandai |
| `get_land_cover` | `lat`, `lng`, `buffer_meters` (100–50000) | komposisi tutupan lahan |

Output berupa teks ringkas berbahasa Indonesia dengan sumber & catatan keterbatasan. Galat
(jaringan, validasi, status API) dikembalikan sebagai teks `Error: …` — tool tidak pernah crash.

## Konfigurasi

| Variabel | Fungsi |
|---|---|
| `ECOSENTRA_API_URL` | URL aplikasi EcoSentra (mis. `http://localhost:8080`) — **sumber data semua tool** |
| `LANDCOVER_API_URL` | (jalur lama) langsung ke `services/geo`; hanya dipakai bila `ECOSENTRA_API_URL` kosong |
| `GEO_API_KEY` | API key `services/geo` untuk jalur lama |

Tanpa konfigurasi: hanya `get_land_cover` yang menjawab, dengan **data MOCK yang ditandai jelas**;
tool lain mengembalikan pesan bahwa konfigurasi dibutuhkan — sengaja **tidak ada data palsu** untuk
titik api, gempa, cuaca, atau NDVI.

## Menjalankan

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env              # isi ECOSENTRA_API_URL
python server.py                  # stdio: menunggu input MCP (Ctrl+C untuk berhenti)
```

Kompatibel dengan `mcp` 1.x dan 2.x (di 2.x `FastMCP` berganti nama `MCPServer`; `server.py` menangani keduanya).

### Claude Desktop

```json
{
  "mcpServers": {
    "ecosentra": {
      "command": "/path/ke/services/mcp/.venv/bin/python",
      "args": ["/path/ke/services/mcp/server.py"],
      "env": { "ECOSENTRA_API_URL": "https://ecosentra.example.com" }
    }
  }
}
```

### Docker

```bash
docker build -t ecosentra-mcp services/mcp
docker run -i --rm -e ECOSENTRA_API_URL=https://ecosentra.example.com ecosentra-mcp   # -i wajib (stdio)
```

## Pengujian

```bash
pip install -r requirements-dev.txt
ruff check .
pytest -q     # 16 uji: tiap tool (HTTP dipalsukan) + uji ujung-ke-ujung lewat protokol MCP stdio sungguhan
```

Uji ujung-ke-ujung menjalankan `server.py` sebagai subprocess, memanggilnya lewat klien MCP resmi,
dengan aplikasi EcoSentra dipalsukan oleh HTTP server lokal.
