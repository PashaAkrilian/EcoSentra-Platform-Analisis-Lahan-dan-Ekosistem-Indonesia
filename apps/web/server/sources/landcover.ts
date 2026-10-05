import "server-only"
import { cached } from "@/server/cache"
import type { LandCoverClass, LandCoverResult } from "@/lib/data/types"
import { MAX_BUFFER_METERS, MIN_BUFFER_METERS } from "@/lib/geo"

/**
 * Analisis tutupan lahan dalam radius `bufferMeters` dari satu titik.
 *
 * 1. Kalau GEO_SERVICE_URL di-set -> services/geo (ESA WorldCover v200 via
 *    Google Earth Engine, butuh service account GEE).
 * 2. Kalau tidak di-set, atau services/geo gagal -> Esri/Impact Observatory
 *    Sentinel-2 10m Land Cover lewat ImageServer publik ArcGIS Living Atlas
 *    (tanpa kredensial, lisensi CC BY 4.0).
 *
 * Kedua dataset beresolusi 10 m tapi skema kelasnya berbeda — respons selalu
 * mencantumkan dataset & tahun yang dipakai (`source`).
 */

interface ClassInfo {
  name: string
  color: string
}

// Legenda resmi ESA WorldCover v200 (https://esa-worldcover.org/en/data-access).
export const ESA_WORLDCOVER_CLASSES: Record<number, ClassInfo> = {
  10: { name: "Tutupan pohon", color: "#006400" },
  20: { name: "Semak belukar", color: "#ffbb22" },
  30: { name: "Padang rumput", color: "#ffff4c" },
  40: { name: "Lahan pertanian", color: "#f096ff" },
  50: { name: "Area terbangun", color: "#fa0000" },
  60: { name: "Lahan terbuka / vegetasi jarang", color: "#b4b4b4" },
  70: { name: "Salju dan es", color: "#f0f0f0" },
  80: { name: "Badan air permanen", color: "#0064c8" },
  90: { name: "Lahan basah herba", color: "#0096a0" },
  95: { name: "Mangrove", color: "#00cf75" },
  100: { name: "Lumut dan liken", color: "#fae6a0" },
}

// Legenda resmi Impact Observatory 10m LULC (https://livingatlas.arcgis.com/landcover/).
export const ESRI_LULC_CLASSES: Record<number, ClassInfo> = {
  1: { name: "Badan air", color: "#419bdf" },
  2: { name: "Pepohonan", color: "#397d49" },
  4: { name: "Vegetasi tergenang", color: "#7a87c6" },
  5: { name: "Tanaman pertanian", color: "#e49635" },
  7: { name: "Area terbangun", color: "#c4281b" },
  8: { name: "Lahan terbuka", color: "#a59b8f" },
  9: { name: "Salju / es", color: "#a8ebff" },
  10: { name: "Tertutup awan", color: "#616161" },
  11: { name: "Padang rumput / semak", color: "#e3e2c3" },
}

const ESRI_IMAGE_SERVER =
  "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer"
const ESRI_MAX_IMAGE_PX = 3000 // batas server 4000 px per sisi; sisakan margin
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // peta tutupan lahan bersifat tahunan
const FETCH_TIMEOUT_MS = 45_000

function areaHa(bufferMeters: number): number {
  return Math.round((Math.PI * bufferMeters ** 2) / 10_000)
}

export function toClasses(counts: Map<number, number>, legend: Record<number, ClassInfo>): LandCoverClass[] {
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  if (total === 0) return []
  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .map(([code, count]) => ({
      code,
      name: legend[code]?.name ?? `Kelas ${code}`,
      color: legend[code]?.color ?? "#9ca3af",
      percentage: Math.round((count / total) * 10_000) / 100,
    }))
    // Kelas di bawah 0,05% (tampil "0%") hanya menambah derau; selisihnya terhadap 100% dapat diabaikan.
    .filter((c) => c.percentage >= 0.05)
    .sort((a, b) => b.percentage - a.percentage)
}

/** Lingkaran (poligon 48 titik) di sekitar titik, dalam derajat WGS84. */
export function circlePolygon(lat: number, lng: number, radiusMeters: number, vertices = 48): number[][] {
  const metersPerDegLat = 111_320
  const metersPerDegLng = 111_320 * Math.cos((lat * Math.PI) / 180)
  const ring: number[][] = []
  for (let i = 0; i <= vertices; i++) {
    const angle = (2 * Math.PI * i) / vertices
    ring.push([
      Number((lng + (radiusMeters * Math.sin(angle)) / metersPerDegLng).toFixed(6)),
      Number((lat + (radiusMeters * Math.cos(angle)) / metersPerDegLat).toFixed(6)),
    ])
  }
  return ring
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), ...init })
  if (!response.ok) throw new Error(`${new URL(url).host} mengembalikan status ${response.status}`)
  return response.json()
}

/** Tahun terbaru yang tersedia di ImageServer Esri (dari timeInfo layanan). */
export async function latestEsriYear(): Promise<number> {
  return cached("esri-lulc:latest-year", CACHE_TTL_MS, async () => {
    const info = (await fetchJson(`${ESRI_IMAGE_SERVER}?f=json`)) as { timeInfo?: { timeExtent?: number[] } }
    const end = info.timeInfo?.timeExtent?.[1]
    if (!end) throw new Error("Esri Land Cover: timeInfo tidak tersedia.")
    return new Date(end).getUTCFullYear()
  })
}

interface EsriHistogramPayload {
  histograms?: { counts: number[]; min: number }[]
  error?: { message?: string; details?: string[] }
}

/** Respons computeHistograms -> jumlah piksel per kode kelas (bin ke-i = nilai piksel; 0 = no data). */
export function esriHistogramToCounts(payload: EsriHistogramPayload): Map<number, number> {
  if (payload.error) {
    throw new Error(`Esri Land Cover: ${payload.error.details?.[0] ?? payload.error.message ?? "error"}`)
  }
  const histogram = payload.histograms?.[0]
  if (!histogram) throw new Error("Esri Land Cover: histogram kosong.")
  const counts = new Map<number, number>()
  histogram.counts.forEach((count, i) => {
    const code = Math.round(histogram.min + 0.5) + i
    if (code !== 0 && count > 0) counts.set(code, count)
  })
  return counts
}

export async function analyzeWithEsri(lat: number, lng: number, bufferMeters: number): Promise<LandCoverResult> {
  const year = await latestEsriYear()
  const pixelSizeM = Math.max(10, Math.ceil((2 * bufferMeters) / ESRI_MAX_IMAGE_PX))
  const params = new URLSearchParams({
    geometry: JSON.stringify({ rings: [circlePolygon(lat, lng, bufferMeters)], spatialReference: { wkid: 4326 } }),
    geometryType: "esriGeometryPolygon",
    time: `${Date.UTC(year, 0, 1)},${Date.UTC(year, 11, 31, 23, 59, 59)}`,
    pixelSize: JSON.stringify({ x: pixelSizeM, y: pixelSizeM, spatialReference: { wkid: 3857 } }),
    f: "json",
  })
  const payload = (await fetchJson(`${ESRI_IMAGE_SERVER}/computeHistograms?${params}`)) as EsriHistogramPayload
  const classes = toClasses(esriHistogramToCounts(payload), ESRI_LULC_CLASSES)
  if (classes.length === 0) throw new Error("Tidak ada data tutupan lahan pada area ini.")

  return {
    source: {
      name: "Esri | Impact Observatory",
      url: "https://livingatlas.arcgis.com/landcover/",
      dataset: "Sentinel-2 10m Land Use/Land Cover",
      year,
      resolutionM: pixelSizeM,
      fetchedAt: new Date().toISOString(),
    },
    lat,
    lng,
    bufferMeters,
    areaHa: areaHa(bufferMeters),
    dominantClass: classes[0]!.name,
    classes,
  }
}

export async function analyzeWithGeoService(
  baseUrl: string,
  lat: number,
  lng: number,
  bufferMeters: number,
): Promise<LandCoverResult> {
  const apiKey = process.env.GEO_SERVICE_API_KEY
  const payload = (await fetchJson(`${baseUrl.replace(/\/$/, "")}/api/landcover`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiKey ? { "X-API-Key": apiKey } : {}) },
    body: JSON.stringify({ lat, lng, buffer_meters: bufferMeters }),
  })) as { classes?: { code: number; percentage: number }[] }

  if (!payload.classes?.length) throw new Error("services/geo mengembalikan data kosong.")

  // services/geo sudah mengembalikan persentase; dihitung ulang lewat toClasses
  // supaya nama (Bahasa Indonesia) & warna konsisten dengan legenda di UI.
  const counts = new Map(payload.classes.map((c) => [c.code, c.percentage]))
  const classes = toClasses(counts, ESA_WORLDCOVER_CLASSES)

  return {
    source: {
      name: "ESA WorldCover via Google Earth Engine (services/geo)",
      url: "https://esa-worldcover.org",
      dataset: "ESA WorldCover v200",
      year: 2021,
      resolutionM: 10,
      fetchedAt: new Date().toISOString(),
    },
    lat,
    lng,
    bufferMeters,
    areaHa: areaHa(bufferMeters),
    dominantClass: classes[0]!.name,
    classes,
  }
}

export async function analyzeLandCover(lat: number, lng: number, bufferMeters: number): Promise<LandCoverResult> {
  const geoServiceUrl = process.env.GEO_SERVICE_URL
  const key = `landcover:${geoServiceUrl ? "geo" : "esri"}:${lat.toFixed(4)},${lng.toFixed(4)}:${bufferMeters}`

  return cached(key, CACHE_TTL_MS, async () => {
    if (geoServiceUrl) {
      try {
        return await analyzeWithGeoService(geoServiceUrl, lat, lng, bufferMeters)
      } catch (error) {
        console.warn(
          "services/geo gagal, beralih ke Esri Land Cover:",
          error instanceof Error ? error.message : error,
        )
      }
    }
    return analyzeWithEsri(lat, lng, bufferMeters)
  })
}
