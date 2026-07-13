# API Contracts — Dashboard EcoSentra

Dokumen ini mendefinisikan bentuk data/response yang **diharapkan** dari
backend untuk statistik di dashboard utama (`apps/web/app/dashboard`).
Saat ini semua data di `apps/web/lib/data/*.ts` masih **mock** — begitu
salah satu backend di bawah siap, cukup ganti isi fungsi terkait di
`lib/data/`, tanpa mengubah komponen UI mana pun (lihat bagian
[Cara Migrasi](#cara-migrasi-dari-mock-ke-api-asli) di bawah).

## Konvensi Umum

- Endpoint diusulkan di bawah `/api/dashboard/*` — **terpisah** dari route
  CRUD generik yang sudah ada (`/api/fields`, `/api/alerts`,
  `/api/ecoServicesMetrics`, `/api/landCoverSnapshots`). Endpoint dashboard
  melakukan **agregasi** (ringkasan lintas data), bukan CRUD 1:1 per dokumen
  Firestore.
- Response sukses: `200 OK`, body JSON sesuai shape di bawah.
- Response gagal: status `4xx`/`5xx`, body `{ "error": string }`.

## `GET /api/dashboard/fields-summary`

```ts
interface FieldsSummary {
  totalFields: number
  totalAreaHa: number
  avgHealthScore: number // 0-100
}
```

```json
{ "totalFields": 12, "totalAreaHa": 348.5, "avgHealthScore": 78 }
```

**Sumber data nanti:** agregasi dari collection Firestore `fields` (lihat
route `/api/fields` yang sudah ada).

## `GET /api/dashboard/landcover-stats`

```ts
interface LandCoverStats {
  totalAreaClassifiedHa: number
  dominantClass: string
  classBreakdown: { name: string; percentage: number }[]
  regionsAnalyzed: number
  lastUpdated: string // ISO 8601
}
```

```json
{
  "totalAreaClassifiedHa": 1245.8,
  "dominantClass": "Cropland",
  "classBreakdown": [
    { "name": "Cropland", "percentage": 42.3 },
    { "name": "Tree cover", "percentage": 31.5 }
  ],
  "regionsAnalyzed": 12,
  "lastUpdated": "2026-07-13T10:00:00.000Z"
}
```

**Sumber data nanti:** agregasi dari hasil `POST /api/landcover` di
`services/geo` (lihat `services/geo/README.md`), dikumpulkan per
field/wilayah yang dipantau, disimpan ke collection `landCoverSnapshots`
(lihat route `/api/landCoverSnapshots` yang sudah ada).

> **Catatan penting:** endpoint ini **beda** dari `/api/landcover` milik
> `services/geo` — punya `services/geo` untuk klasifikasi **satu titik +
> buffer** (dipakai fitur klik-peta), sedangkan ini untuk **ringkasan
> agregat** semua area yang dipantau di dashboard.

## `GET /api/dashboard/fire-hotspot-count`

```ts
interface FireHotspotCount {
  last24h: number
  last7d: number
  highConfidence: number
  lastDetectedAt: string | null // ISO 8601
}
```

```json
{
  "last24h": 7,
  "last7d": 34,
  "highConfidence": 4,
  "lastDetectedAt": "2026-07-13T07:00:00.000Z"
}
```

**Sumber data nanti:** NASA FIRMS (pola data hotspot yang sama sudah dipakai
sebagian di `components/leaflet-map.tsx`).

## `GET /api/dashboard/active-alerts-count`

```ts
interface ActiveAlertsSummary {
  total: number
  bySeverity: {
    high: number
    medium: number
    low: number
  }
}
```

```json
{ "total": 5, "bySeverity": { "high": 1, "medium": 2, "low": 2 } }
```

**Sumber data nanti:** agregasi dari collection Firestore `alerts` (lihat
route `/api/alerts` yang sudah ada).

## Cara Migrasi dari Mock ke API Asli

Tiap fungsi di `apps/web/lib/data/*.ts` cukup diganti isinya, contoh untuk
`getFieldsSummary`:

```ts
export async function getFieldsSummary(): Promise<FieldsSummary> {
  const res = await fetch("/api/dashboard/fields-summary")
  if (!res.ok) throw new Error(`Failed to fetch fields summary: ${res.status}`)
  return res.json()
}
```

Tidak ada komponen UI yang perlu diubah — bentuk data (`FieldsSummary`, dst,
didefinisikan di `apps/web/lib/data/types.ts`) sudah didesain identik dengan
kontrak di dokumen ini.
