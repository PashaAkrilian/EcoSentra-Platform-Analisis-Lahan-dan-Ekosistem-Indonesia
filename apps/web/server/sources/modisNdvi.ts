import "server-only"
import { cached } from "@/server/cache"
import type { NdviObservation, NdviResponse } from "@/lib/data/types"

/**
 * NDVI MODIS MOD13Q1 (komposit 16 hari, 250 m) di satu titik, lewat ORNL DAAC
 * MODIS Web Service (https://modis.ornl.gov/data/modis_webservice.html),
 * publik tanpa API key.
 *
 * Indonesia sering tertutup awan, jadi band pixel_reliability ikut diambil:
 * observasi "berawan" ditandai supaya UI tidak menganggap nilai NDVI rendah
 * akibat awan sebagai vegetasi yang rusak.
 */
const ORNL_URL = "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset"
const CACHE_TTL_MS = 12 * 60 * 60 * 1000 // komposit baru muncul tiap 16 hari
const FETCH_TIMEOUT_MS = 60_000
const MAX_DATES_PER_REQUEST = 10 // batas ORNL per permintaan subset
const COMPOSITE_DAYS = 16
const WINDOWS = 2 // 2 x 10 komposit ≈ 10 bulan riwayat

const NDVI_SCALE = 0.0001
const NDVI_FILL_VALUE = -3000

const RELIABILITY: Record<number, NdviObservation["quality"]> = {
  0: "baik",
  1: "marginal",
  2: "salju/es",
  3: "berawan",
}

/** Date -> kode tanggal MODIS "AYYYYDDD" (hari ke-n dalam tahun). */
export function toModisDate(date: Date): string {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1)
  const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000) + 1
  return `A${date.getUTCFullYear()}${String(dayOfYear).padStart(3, "0")}`
}

interface OrnlSubset {
  subset?: { calendar_date: string; data: number[] }[]
}

async function fetchBand(lat: number, lng: number, band: string, start: Date, end: Date) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    band,
    startDate: toModisDate(start),
    endDate: toModisDate(end),
    kmAboveBelow: "0",
    kmLeftRight: "0",
  })
  const response = await fetch(`${ORNL_URL}?${params}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`ORNL MODIS mengembalikan status ${response.status}`)
  }
  const payload = (await response.json()) as OrnlSubset
  return new Map((payload.subset ?? []).map((s) => [s.calendar_date, s.data[0]]))
}

export function mergeNdviBands(ndvi: Map<string, number | undefined>, reliability: Map<string, number | undefined>) {
  const observations: NdviObservation[] = []
  for (const [date, raw] of ndvi) {
    if (raw === undefined || raw <= NDVI_FILL_VALUE) continue
    const quality = RELIABILITY[reliability.get(date) ?? -1] ?? "tidak diketahui"
    observations.push({ date, ndvi: Math.round(raw * NDVI_SCALE * 1000) / 1000, quality })
  }
  return observations.sort((a, b) => a.date.localeCompare(b.date))
}

export async function getNdviSeries(lat: number, lng: number, now = new Date()): Promise<NdviResponse> {
  // Dibulatkan ke 3 desimal (~110 m) — lebih halus dari 1 piksel MODIS (250 m).
  const rLat = Math.round(lat * 1000) / 1000
  const rLng = Math.round(lng * 1000) / 1000

  return cached(`ornl-ndvi:${rLat},${rLng}`, CACHE_TTL_MS, async () => {
    const windowMs = (MAX_DATES_PER_REQUEST * COMPOSITE_DAYS - 1) * 86_400_000
    const windows = Array.from({ length: WINDOWS }, (_, i) => {
      const end = new Date(now.getTime() - i * (windowMs + 86_400_000))
      return { start: new Date(end.getTime() - windowMs), end }
    })

    const results = await Promise.all(
      windows.flatMap(({ start, end }) => [
        fetchBand(rLat, rLng, "250m_16_days_NDVI", start, end),
        fetchBand(rLat, rLng, "250m_16_days_pixel_reliability", start, end),
      ]),
    )
    const ndvi = new Map<string, number | undefined>()
    const reliability = new Map<string, number | undefined>()
    results.forEach((band, i) => band.forEach((value, date) => (i % 2 === 0 ? ndvi : reliability).set(date, value)))

    const observations = mergeNdviBands(ndvi, reliability)
    const usable = observations.filter((o) => o.quality === "baik" || o.quality === "marginal")

    return {
      source: {
        name: "NASA MODIS via ORNL DAAC",
        url: "https://modis.ornl.gov/data/modis_webservice.html",
        product: "MOD13Q1 v061 (komposit 16 hari)",
        resolutionM: 250,
        fetchedAt: new Date().toISOString(),
      },
      lat: rLat,
      lng: rLng,
      observations,
      latest: usable.at(-1) ?? null,
    }
  })
}
