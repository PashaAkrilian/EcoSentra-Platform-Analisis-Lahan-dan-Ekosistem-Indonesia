import "server-only"
import { cached } from "@/server/cache"
import { isInIndonesiaBbox } from "@/lib/geo"
import { findProvince, PROVINCES } from "@/server/geo/indonesia"
import type {
  FireConfidence,
  FireHotspot,
  HotspotRange,
  HotspotSummary,
  IslandGroup,
  ProvinceHotspotCount,
} from "@/lib/data/types"

/**
 * NASA FIRMS — titik api aktif VIIRS (375 m), dari file CSV publik per
 * wilayah (tanpa MAP_KEY): https://firms.modaps.eosdis.nasa.gov/active_fire/
 * File "SouthEast_Asia" mencakup negara tetangga juga, jadi tiap titik
 * difilter ke daratan Indonesia memakai batas provinsi (server/geo).
 */
const FIRMS_BASE_URL = "https://firms.modaps.eosdis.nasa.gov/data/active_fire"

const SATELLITES = {
  snpp: { label: "Suomi NPP VIIRS 375 m", path: "suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2" },
  noaa20: { label: "NOAA-20 VIIRS 375 m", path: "noaa-20-viirs-c2/csv/J1_VIIRS_C2" },
  noaa21: { label: "NOAA-21 VIIRS 375 m", path: "noaa-21-viirs-c2/csv/J2_VIIRS_C2" },
} as const

type SatelliteKey = keyof typeof SATELLITES

const CACHE_TTL_MS = 15 * 60 * 1000 // FIRMS NRT diperbarui tiap ~3 jam
const FETCH_TIMEOUT_MS = 120_000 // file FIRMS 1-6 MB; dari Indonesia unduhan bisa puluhan detik
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

function satelliteKey(): SatelliteKey {
  const key = process.env.FIRMS_SATELLITE as SatelliteKey | undefined
  return key && key in SATELLITES ? key : "snpp"
}

export function firmsCsvUrl(range: HotspotRange, satellite: SatelliteKey = satelliteKey()): string {
  return `${FIRMS_BASE_URL}/${SATELLITES[satellite].path}_SouthEast_Asia_${range}.csv`
}

function normalizeConfidence(value: string): FireConfidence {
  switch (value.trim().toLowerCase()) {
    case "h":
    case "high":
      return "high"
    case "l":
    case "low":
      return "low"
    default:
      return "nominal"
  }
}

/** "2026-10-04" + "0404" (UTC) -> "2026-10-04T04:04:00.000Z" */
function toIsoUtc(acqDate: string, acqTime: string): string | null {
  const time = acqTime.padStart(4, "0")
  const iso = `${acqDate}T${time.slice(0, 2)}:${time.slice(2, 4)}:00.000Z`
  return Number.isNaN(Date.parse(iso)) ? null : new Date(iso).toISOString()
}

/**
 * Parse CSV VIIRS FIRMS dan simpan hanya titik di daratan Indonesia.
 * Format kolom (header baris pertama): latitude, longitude, bright_ti4,
 * scan, track, acq_date, acq_time, satellite, confidence, version,
 * bright_ti5, frp, daynight. CSV FIRMS tidak memakai quoting.
 */
export function parseFirmsCsv(csv: string): FireHotspot[] {
  const lines = csv.split(/\r?\n/)
  const header = lines[0]?.split(",").map((h) => h.trim()) ?? []
  const col = (name: string) => header.indexOf(name)
  const iLat = col("latitude")
  const iLng = col("longitude")
  const iBright = col("bright_ti4")
  const iFrp = col("frp")
  const iConf = col("confidence")
  const iDate = col("acq_date")
  const iTime = col("acq_time")
  const iDayNight = col("daynight")

  if ([iLat, iLng, iBright, iFrp, iConf, iDate, iTime].some((i) => i < 0)) {
    throw new Error("Format CSV FIRMS tidak dikenali (kolom wajib tidak ditemukan).")
  }

  const hotspots: FireHotspot[] = []
  for (let n = 1; n < lines.length; n++) {
    const line = lines[n]
    if (!line) continue
    const cells = line.split(",")
    const lat = Number(cells[iLat])
    const lng = Number(cells[iLng])
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInIndonesiaBbox(lat, lng)) continue

    const province = findProvince(lat, lng)
    if (!province) continue

    const acquiredAt = toIsoUtc(cells[iDate] ?? "", cells[iTime] ?? "")
    if (!acquiredAt) continue

    hotspots.push({
      lat,
      lng,
      brightnessK: Number(cells[iBright]) || 0,
      frpMw: Number(cells[iFrp]) || 0,
      confidence: normalizeConfidence(cells[iConf] ?? ""),
      acquiredAt,
      daynight: cells[iDayNight]?.trim() === "N" ? "N" : "D",
      provinceIso: province.iso,
      provinceName: province.name,
      island: province.island,
    })
  }

  hotspots.sort((a, b) => b.acquiredAt.localeCompare(a.acquiredAt))
  return hotspots
}

export interface HotspotDataset {
  range: HotspotRange
  url: string
  satellite: string
  fetchedAt: string
  hotspots: FireHotspot[]
}

export async function getHotspotDataset(range: HotspotRange): Promise<HotspotDataset> {
  const satellite = satelliteKey()
  const url = firmsCsvUrl(range, satellite)

  return cached(`firms:${satellite}:${range}`, CACHE_TTL_MS, async () => {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`NASA FIRMS mengembalikan status ${response.status}`)
    }
    const hotspots = parseFirmsCsv(await response.text())
    return { range, url, satellite: SATELLITES[satellite].label, fetchedAt: new Date().toISOString(), hotspots }
  })
}

/** Tanggal kalender WIB (UTC+7) dari timestamp ISO UTC. */
export function toWibDate(isoUtc: string): string {
  return new Date(Date.parse(isoUtc) + WIB_OFFSET_MS).toISOString().slice(0, 10)
}

export function summarizeHotspots(dataset: HotspotDataset): HotspotSummary {
  const byProvince = new Map<string, ProvinceHotspotCount & { sumLat: number; sumLng: number }>()
  const byIsland = new Map<IslandGroup, number>()
  const byDay = new Map<string, number>()
  let highConfidence = 0

  for (const h of dataset.hotspots) {
    const province = byProvince.get(h.provinceIso) ?? {
      iso: h.provinceIso,
      name: h.provinceName,
      island: h.island,
      count: 0,
      highConfidence: 0,
      center: { lat: 0, lng: 0 },
      sumLat: 0,
      sumLng: 0,
    }
    province.count++
    province.sumLat += h.lat
    province.sumLng += h.lng
    if (h.confidence === "high") {
      province.highConfidence++
      highConfidence++
    }
    byProvince.set(h.provinceIso, province)
    byIsland.set(h.island, (byIsland.get(h.island) ?? 0) + 1)
    const day = toWibDate(h.acquiredAt)
    byDay.set(day, (byDay.get(day) ?? 0) + 1)
  }

  const islandOrder = [...new Set(Object.values(PROVINCES).map((p) => p.island))]

  return {
    source: {
      name: "NASA FIRMS",
      url: dataset.url,
      satellite: dataset.satellite,
      fetchedAt: dataset.fetchedAt,
    },
    range: dataset.range,
    total: dataset.hotspots.length,
    highConfidence,
    latestAcquiredAt: dataset.hotspots[0]?.acquiredAt ?? null,
    byProvince: [...byProvince.values()]
      .map(({ sumLat, sumLng, ...p }) => ({
        ...p,
        center: { lat: Math.round((sumLat / p.count) * 1e4) / 1e4, lng: Math.round((sumLng / p.count) * 1e4) / 1e4 },
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    byIsland: islandOrder.map((island) => ({ island, count: byIsland.get(island) ?? 0 })),
    byDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
  }
}
