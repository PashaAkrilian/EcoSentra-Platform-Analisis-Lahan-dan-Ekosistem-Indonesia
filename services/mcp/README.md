# services/mcp — EcoSentra MCP Server

MCP (Model Context Protocol) server yang mengekspos tools ke asisten AI
(chatbot **LandAI** di EcoSentra) untuk mengambil data nyata lewat pemanggilan
tool, bukan cuma teks generatif.

## Tools

### `get_land_cover`

Klasifikasi tutupan lahan (land cover) di sekitar sebuah koordinat.

| Param | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `lat` | float | ya | Latitude (-90..90) |
| `lng` | float | ya | Longitude (-180..180) |
| `buffer_meters` | int | tidak (default 1000) | Radius area dalam meter (100-50000) |

**Mode Mock (default):** kalau `LANDCOVER_API_URL` belum di-set, tool
mengembalikan data contoh yang realistis (bentuknya sama persis dengan
respons API asli), ditandai jelas dengan catatan `[MOCK]` di output — supaya
MCP server ini tetap bisa dites/didemokan sebelum layanan
[`services/geo`](../geo) selesai dibangun.

**Mode Asli:** begitu `LANDCOVER_API_URL` di-set (mis. ke layanan
`services/geo` yang sudah jalan), tool otomatis memanggil
`POST {url}/api/landcover` lewat `httpx` dan meneruskan hasilnya — **tidak
perlu ubah kode sama sekali**.

Contoh output (kedua mode, bentuknya identik kecuali catatan MOCK):
```
Klasifikasi tutupan lahan pada titik (-6.5714, 107.7638), radius 1000m:
- Kelas dominan: Built-up (66.78%)
- Rincian: Built-up 66.78%, Tree cover 23.14%, Cropland 7.75%, Grassland 2.33%

[Catatan: ini data MOCK — LANDCOVER_API_URL belum dikonfigurasi]
```

Error (input tidak valid atau layanan tidak bisa dihubungi) dikembalikan
sebagai teks `Error: ...` yang jelas — tool tidak pernah crash.

## Menjalankan Lokal

```bash
cd services/mcp
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# .env dibiarkan kosong (LANDCOVER_API_URL=) untuk mode mock.
# Isi dengan URL services/geo (mis. http://localhost:8001) kalau layanan
# itu sudah jalan dan mau dites dengan data asli.

python server.py
```

Server akan "menggantung" menunggu input lewat stdio — itu tandanya jalan
normal (MCP server dipanggil sebagai subprocess oleh aplikasi AI, bukan
diakses langsung seperti web server). Tekan `Ctrl+C` untuk berhenti.

## Cara Menguji Tool

**Opsi 1 — MCP Inspector (interaktif, resmi dari MCP Python SDK):**
```bash
pip install "mcp[cli]"
mcp dev server.py
```
Ini membuka MCP Inspector di browser (butuh Node.js/`npx` terpasang), tempat
kamu bisa memanggil `get_land_cover` manual dengan input apa pun dan lihat
hasilnya langsung.

**Opsi 2 — Script Python (otomatis, dipakai untuk verifikasi saat development):**
```python
import asyncio, sys
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    params = StdioServerParameters(command=sys.executable, args=["server.py"], cwd=".")
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool(
                "get_land_cover", {"lat": -6.5714, "lng": 107.7638, "buffer_meters": 1000}
            )
            print("".join(c.text for c in result.content if hasattr(c, "text")))

asyncio.run(main())
```

## Mengaktifkan Mode Asli (setelah `services/geo` siap)

Edit `services/mcp/.env`:
```
LANDCOVER_API_URL=http://localhost:8001
```
Tidak ada perubahan kode. Untuk deploy, set `LANDCOVER_API_URL` sebagai
environment variable/secret di platform deploy, mengarah ke URL publik
layanan `services/geo` yang sudah di-deploy.

## Deploy

Lihat `Dockerfile` di folder ini. `.env` dan `credentials/` (kalau ada tool
lain yang butuh kredensial nanti) tidak ikut ke image — semua konfigurasi
lewat environment variable saat runtime.
