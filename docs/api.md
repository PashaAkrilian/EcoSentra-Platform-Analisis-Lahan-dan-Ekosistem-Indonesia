# Referensi API — EcoSentra

Semua endpoint ada di `apps/web/app/api/*` (Next.js route handlers). Tipe data
respons didefinisikan di [`apps/web/lib/data/types.ts`](../apps/web/lib/data/types.ts)
dan dipakai bersama oleh UI.

## Konvensi

- Respons sukses: JSON (kecuali ekspor & `/api/chat`). Respons gagal selalu
  `{ "error": "pesan" }` dengan status yang sesuai:

  | Status | Arti |
  |---|---|
  | 400 | parameter/body tidak valid (pesan menyebut field-nya) |
  | 401 | butuh login (token tidak ada/tidak valid) |
  | 403 | login valid tapi bukan admin |
  | 404 | data tidak ada **atau milik pengguna lain** (sengaja tidak dibedakan) |
  | 413 | body > 100 KB (200 KB untuk `/api/chat`) |
  | 429 | terlalu banyak permintaan (header `Retry-After`) |
  | 503 | Firebase belum dikonfigurasi di server |
  | 500 | kesalahan tak terduga (detail hanya di log server) |

- Koordinat (`lat`, `lng`) harus berada di kotak pembatas Indonesia
  (`lng` 94,5–141,5; `lat` −11,5–6,5), selain itu `400`.
- `province` menerima kode ISO (`ID-KT`), nama (`Kalimantan Tengah`), atau
  singkatan umum (`kalteng`); hasilnya selalu dinormalkan ke kode ISO.
- Waktu dalam respons berformat ISO 8601 UTC. Hari kalender untuk agregasi
  dihitung di zona **WIB (UTC+7)**.
- Respons data publik membawa `source` (nama, URL, `fetchedAt`) — atribusi ke
  penyedia data wajib dipertahankan kalau Anda memakai ulang datanya
  (lihat [`data-sources.md`](./data-sources.md)).

## Data publik (tanpa login)

Data diambil dari penyedia eksternal lalu di-cache di memori server
(*stale-while-revalidate*), sehingga pengguna hampir selalu mendapat respons cepat.

| Endpoint | Parameter | Respons | Batas laju | Cache server |
|---|---|---|---|---|
| `GET /api/hotspots` | `range` = `24h`\|`48h`\|`7d` (default `24h`), `province` (wajib untuk `7d`) | `HotspotPointsResponse` — ringkasan + `points` format ringkas `[lat, lng, frpMw, confidence 0-2, epochDetik, isoProvinsi]` | – | 15 mnt |
| `GET /api/hotspots/summary` | `range`, `province` | `HotspotSummary` — total, keyakinan tinggi, per provinsi (+pusat), per pulau, per hari WIB | – | 15 mnt |
| `GET /api/hotspots/export` | `range`, `province`, `format` = `geojson`\|`csv`\|`kml` | file unduhan (maks 25.000 titik, selain itu `413`) | 10/mnt/IP | 15 mnt |
| `GET /api/earthquakes` | – | `EarthquakesResponse` — `latest`, `recent` (M 5+), `felt` | – | 1 mnt |
| `GET /api/weather` | `lat`, `lng` | `WeatherResponse` — kondisi terkini, kelembapan tanah (model), 7 hari | 30/mnt/IP | 15 mnt |
| `GET /api/ndvi` | `lat`, `lng` | `NdviResponse` — ±10 bulan komposit 16 hari, tiap observasi bertanda kualitas (`berawan` = tidak andal) | 10/mnt/IP | 12 jam |
| `GET /api/landcover` | `lat`, `lng`, `buffer` (m, 100–50.000, default 1000) | `LandCoverResult` — kelas dominan & persentase per kelas | 10/mnt/IP | 24 jam |
| `GET /api/ecosystem/province` | `iso` | `ProvinceLandCover` — komposisi tutupan lahan satu provinsi | 20/mnt/IP | 7 hari |
| `GET /api/geo/provinces` | – | GeoJSON 34 provinsi (properti `iso`, `name`, `island`, `areaKm2`) | – | statis |
| `GET /api/meta` | – | `{ landcoverYear }` (tahun terbaru peta tutupan lahan Esri) | – | 24 jam |
| `GET /api/alerts` | – | `{ configured, alerts }` — peringatan kurasi admin (daftar kosong kalau Firebase belum aktif) | – | – |
| `GET /api/healthcheck` | – | `{ status, time, integrations }` — status integrasi opsional, tanpa nilai rahasia | – | – |

### Tutupan lahan: dua dataset

`/api/landcover` memakai **Esri / Impact Observatory Sentinel-2 10 m LULC**
(ImageServer publik, tanpa kredensial). Kalau `GEO_SERVICE_URL` di-set, ia
mencoba `services/geo` (ESA WorldCover v200 via Google Earth Engine) lebih dulu
dan jatuh ke Esri bila gagal. Respons selalu menyebut dataset & tahun di
`source`, karena skema kelas kedua dataset berbeda.

## Data pribadi (butuh login)

Header: `Authorization: Bearer <Firebase ID token>`. Setiap dokumen punya
`userId` pemilik; pengguna hanya bisa membaca/mengubah miliknya sendiri.

| Endpoint | Fungsi |
|---|---|
| `GET /api/fields` · `POST /api/fields` | daftar / buat lahan (`name`, `cropType`, `areaHa`, `plantingDate?`, `location`, `notes?`) |
| `GET/PATCH/DELETE /api/fields/{id}` | baca / ubah / hapus lahan (hapus juga riwayat analisisnya) |
| `POST /api/fields/{id}/analyze` | analisis tutupan lahan di lokasi lahan, simpan sebagai snapshot (10/mnt/IP). Hasil dihitung di server — klien tidak bisa mengirim hasil sendiri |
| `GET /api/landCoverSnapshots?fieldId=` | riwayat analisis |
| `GET /api/decisions` · `POST /api/decisions` | daftar / buat skenario keputusan |
| `PATCH/DELETE /api/decisions/{id}` | ubah / hapus skenario |
| `GET/PUT /api/profile` | profil (`displayName`, `organization`); `isAdmin` datang dari custom claim token, bukan dari dokumen |
| `DELETE /api/profile` | hapus akun **dan semua datanya** (tidak bisa dibatalkan) |

Body ditolak (`400`) bila memuat field yang tidak dikenal (`.strict()`), dan
field yang diisi server (`id`, `userId`, `createdAt`) tidak bisa dikirim klien.

## Admin

Pengguna dengan custom claim `admin: true` (lihat
[`deployment.md`](./deployment.md#memberi-peran-admin)):

| Endpoint | Fungsi |
|---|---|
| `POST /api/alerts` | terbitkan peringatan kurasi (`type`, `severity`, `title`, `regionName`, `location`, …) |
| `PATCH/DELETE /api/alerts/{id}` | ubah status / hapus |

## Asisten LandAI — `POST /api/chat`

Body: `{ "messages": [{ "role": "user"|"assistant", "content": "…" }], "context"?: { "location": { "lat", "lng" } } }`
(pesan terakhir wajib dari `user`; maks 30 pesan × 4.000 karakter).

Respons: **NDJSON** (`application/x-ndjson`), satu objek JSON per baris:

```jsonl
{"type":"mode","mode":"claude","notice":null}
{"type":"tool","name":"get_fire_hotspots","label":"Mengambil data titik api"}
{"type":"delta","text":"Di Kalimantan Tengah terdeteksi …"}
{"type":"done","tools":["get_fire_hotspots"]}
```

Mode ditentukan server:

| Kondisi | Mode |
|---|---|
| `ANTHROPIC_API_KEY` kosong | `rules` — jawaban dari aturan kata kunci + data asli, tanpa model bahasa |
| kunci ada, Firebase aktif, pengguna **login** | `claude` — model Claude memakai alat data langsung (batas 8 req/mnt/IP dan 150/hari/pengguna) |
| kunci ada, Firebase aktif, **belum login** | `rules` dengan `notice: "login"` (melindungi kunci/biaya dari penyalahgunaan) |
| kunci ada, Firebase tidak aktif (dev lokal) | `claude` dengan batas 8 req/mnt/IP |

Alat yang dipakai model: `get_fire_hotspots`, `get_earthquakes`, `get_weather`,
`get_ndvi`, `get_land_cover`, `get_province_land_cover`, dan `get_location_briefing` —
semuanya memakai modul sumber data yang sama dengan endpoint publik di atas.

- `get_fire_hotspots` menerima `lat` + `lng` (opsional) untuk menghitung titik api dalam radius 5/10/25 km
  dan yang terdekat (`nearby`).
- `get_location_briefing(lat, lng, category?)` merangkum satu lokasi sekaligus: titik api sekitar, cuaca,
  NDVI, tutupan lahan 1 km, dan rekomendasi aturan yang sama dengan halaman Pendukung Keputusan. Sumber
  yang gagal dicantumkan di `unavailable`; bagian lain tetap dikembalikan.
- Mode aturan memakai alat ini untuk pertanyaan yang memuat koordinat ("risikonya apa di -2.21, 113.91?"),
  atau "di sini" dengan titik terpilih di peta.
