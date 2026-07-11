# services/geo — EcoSentra Geo Service

Layanan FastAPI yang menerima koordinat + radius buffer, mengklasifikasikan
tutupan lahan area tersebut lewat Google Earth Engine (dataset
[ESA WorldCover v200](https://esa-worldcover.org/en/data-access)), dan
mengembalikan breakdown persentase tiap kelas dalam JSON — dipakai frontend
untuk menampilkan info tutupan lahan di peta Leaflet.

## Prasyarat

- Python 3.10+
- Google Cloud Project dengan **Earth Engine API** aktif
- Service account GCP yang punya akses Earth Engine, plus file JSON key-nya

## Setup Kredensial

**JANGAN PERNAH commit file JSON key atau file `.env`.** Keduanya sudah
di-gitignore lewat pola `credentials/` dan `.env` di `.gitignore` root repo.

1. Taruh file JSON key service account di `services/geo/credentials/gee-service-account.json`
   (folder ini sudah di-gitignore).
2. Copy `.env.example` jadi `.env`, lalu isi:
   ```bash
   cp .env.example .env
   ```
   ```
   GEE_SERVICE_ACCOUNT=<client_email dari file JSON key>
   GEE_KEY_PATH=./credentials/gee-service-account.json
   ```
   `GEE_CREDENTIALS_JSON` dibiarkan kosong untuk development lokal — itu
   hanya dipakai saat deploy (lihat bagian Deploy di bawah).

## Menjalankan Lokal

```bash
cd services/geo
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# (Opsional) verifikasi koneksi GEE sebelum jalankan server penuh:
python test_gee.py    # harus mencetak "GEE OK"

uvicorn app.main:app --reload --port 8001
```

Server berjalan di `http://localhost:8001`.

## Contoh Request/Response

```bash
curl -X POST http://localhost:8001/api/landcover \
  -H "Content-Type: application/json" \
  -d '{"lat": -6.7333, "lng": 106.7167, "buffer_meters": 1500}'
```

```json
{
  "dominant_class": "Tree cover",
  "classes": [
    { "name": "Tree cover", "code": 10, "percentage": 99.54 },
    { "name": "Grassland", "code": 30, "percentage": 0.39 },
    { "name": "Built-up", "code": 50, "percentage": 0.07 }
  ]
}
```

Input tidak valid (mis. `lat` di luar -90..90, atau `buffer_meters` di luar
100..50000) akan dibalikan sebagai `422` dengan detail error dari Pydantic.
Kegagalan Earth Engine (kredensial salah, timeout, dll.) dibalikan sebagai
`502` dengan body `{"error": "..."}`, bukan crash.

## Dataset: ESA WorldCover v200

11 kelas tutupan lahan, resolusi 10m, snapshot tahun 2021:

| Code | Nama Kelas |
|------|------------|
| 10 | Tree cover |
| 20 | Shrubland |
| 30 | Grassland |
| 40 | Cropland |
| 50 | Built-up |
| 60 | Bare / sparse vegetation |
| 70 | Snow and ice |
| 80 | Permanent water bodies |
| 90 | Herbaceous wetland |
| 95 | Mangroves |
| 100 | Moss and lichen |

## Deploy (Hugging Face Spaces / Railway)

Platform-platform ini umumnya tidak punya filesystem persisten untuk
menyimpan file JSON key, jadi dipakai `GEE_CREDENTIALS_JSON` alih-alih
`GEE_KEY_PATH`:

1. Buka isi file JSON key kamu, copy seluruh isinya (satu baris/minified oke).
2. Di dashboard platform deploy, set environment variable/secret:
   - `GEE_CREDENTIALS_JSON` = isi penuh JSON key tadi
   - `GEE_SERVICE_ACCOUNT` = (opsional, kalau tidak di-set, akan otomatis
     diambil dari field `client_email` di dalam `GEE_CREDENTIALS_JSON`)
3. **JANGAN** taruh isi JSON key di `Dockerfile`, kode, atau file yang ter-commit.
4. Build & deploy pakai `Dockerfile` di folder ini.

Railway meng-inject `$PORT` secara dinamis; Hugging Face Spaces (Docker SDK)
memakai port `7860` secara default — `Dockerfile` sudah menangani keduanya.
