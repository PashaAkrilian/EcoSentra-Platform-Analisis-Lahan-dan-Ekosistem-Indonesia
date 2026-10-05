# services/geo — EcoSentra Geo Service

Layanan FastAPI **opsional** yang menerima koordinat + radius buffer,
mengklasifikasikan tutupan lahan area tersebut lewat Google Earth Engine (dataset
[ESA WorldCover v200](https://esa-worldcover.org/en/data-access), 10 m, snapshot 2021),
dan mengembalikan persentase tiap kelas.

Aplikasi web (`apps/web`) memakainya bila `GEO_SERVICE_URL` di-set; tanpa itu (atau saat
layanan gagal) aplikasi memakai Esri / Impact Observatory 10 m yang tidak butuh kredensial.
Kelebihan ESA WorldCover di sini: kelas **Mangrove** dan lahan basah terpisah, dan lisensi CC BY 4.0.

## Prasyarat

- Python 3.11+
- Google Cloud Project dengan **Earth Engine API** aktif
- Service account yang terdaftar di Earth Engine + file JSON key-nya

## Setup kredensial

**JANGAN PERNAH commit file JSON key atau `.env`** (sudah di-gitignore: `credentials/`, `.env`).

```bash
cp .env.example .env
# isi GEE_SERVICE_ACCOUNT (client_email dari JSON key) dan GEE_KEY_PATH=./credentials/gee-service-account.json
# taruh file key di services/geo/credentials/
```

## Menjalankan

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python check_gee.py                 # verifikasi koneksi: harus mencetak "GEE OK"
uvicorn app.main:app --reload --port 8001
```

## API

`POST /api/landcover` — body `{ "lat": -6.7333, "lng": 106.7167, "buffer_meters": 1500 }`
(`buffer_meters` 100–50000, default 1000).

```json
{
  "dominant_class": "Tree cover",
  "classes": [
    { "name": "Tree cover", "code": 10, "percentage": 99.54 },
    { "name": "Grassland", "code": 30, "percentage": 0.39 }
  ]
}
```

| Status | Arti |
|---|---|
| 401 | `GEO_API_KEY` di-set tetapi header `X-API-Key` salah/tidak ada |
| 422 | input tidak valid (Pydantic) |
| 429 | lebih dari 10 permintaan/menit/IP (slowapi, in-memory) |
| 502 | kegagalan Earth Engine (kredensial, timeout, tidak ada data) — body `{"error": "..."}` |
| 500 | kesalahan tak terduga (detail hanya di log, tidak dibocorkan) |

`GET /health` selalu publik.

### Keamanan

Set **`GEO_API_KEY`** pada layanan yang dapat dijangkau publik; tanpa itu siapa pun yang
tahu URL-nya bisa menghabiskan kuota Earth Engine Anda. Isi nilai yang sama di `apps/web`
sebagai `GEO_SERVICE_API_KEY`. Rate limit in-memory hanya jaring pengaman awal (reset saat
restart, tidak berlaku lintas instance).

## Pengujian

```bash
pip install -r requirements-dev.txt
ruff check .
pytest -q          # 13 uji: API, validasi, rate limit, API key, logika GEE (earthengine di-stub)
```

Uji tidak membutuhkan `earthengine-api` terpasang maupun kredensial.

## Dataset: ESA WorldCover v200

| Code | Kelas | Code | Kelas |
|---|---|---|---|
| 10 | Tree cover | 70 | Snow and ice |
| 20 | Shrubland | 80 | Permanent water bodies |
| 30 | Grassland | 90 | Herbaceous wetland |
| 40 | Cropland | 95 | Mangroves |
| 50 | Built-up | 100 | Moss and lichen |
| 60 | Bare / sparse vegetation | | |

## Deploy (Cloud Run / Railway / Hugging Face Spaces)

Pakai `Dockerfile` (python 3.12, user non-root, healthcheck `/health`). Platform tanpa
filesystem persisten: isi `GEE_CREDENTIALS_JSON` dengan isi penuh JSON key lewat secret manager
platform (jangan taruh di Dockerfile/kode); `GEE_SERVICE_ACCOUNT` otomatis diambil dari
`client_email` bila kosong. Port dari `$PORT` (fallback 7860).
