import "server-only"
import { cached } from "@/server/cache"
import type { Earthquake, EarthquakesResponse } from "@/lib/data/types"

/**
 * BMKG — data gempa bumi terbuka (https://data.bmkg.go.id/gempabumi/).
 * Syarat penggunaan BMKG: wajib mencantumkan BMKG sebagai sumber data.
 *
 * - autogempa.json      : 1 gempa terbaru
 * - gempaterkini.json   : 15 gempa M 5.0+ terbaru (ada info potensi tsunami)
 * - gempadirasakan.json : 15 gempa terbaru yang dirasakan (ada skala MMI)
 */
const BMKG_BASE_URL = "https://data.bmkg.go.id/DataMKG/TEWS"
const CACHE_TTL_MS = 60 * 1000 // BMKG sendiri men-cache 60 detik (header max-age=60)
const FETCH_TIMEOUT_MS = 15_000

interface BmkgQuake {
  DateTime?: string
  Coordinates?: string
  Magnitude?: string
  Kedalaman?: string
  Wilayah?: string
  Potensi?: string
  Dirasakan?: string
  Shakemap?: string
}

interface BmkgPayload {
  Infogempa?: { gempa?: BmkgQuake | BmkgQuake[] }
}

export function hasTsunamiPotential(potensi: string | undefined): boolean {
  if (!potensi) return false
  const text = potensi.toLowerCase()
  return text.includes("tsunami") && !text.includes("tidak berpotensi")
}

/** Ubah satu record BMKG ke bentuk Earthquake; null kalau datanya tidak lengkap. */
export function normalizeQuake(raw: BmkgQuake): Earthquake | null {
  const [latText, lngText] = (raw.Coordinates ?? "").split(",")
  const lat = Number(latText)
  const lng = Number(lngText)
  const magnitude = Number(raw.Magnitude)
  const occurredAt = raw.DateTime ? Date.parse(raw.DateTime) : NaN

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(magnitude) || Number.isNaN(occurredAt)) {
    return null
  }

  const iso = new Date(occurredAt).toISOString()
  return {
    id: `${iso}_${lat}_${lng}`,
    occurredAt: iso,
    lat,
    lng,
    magnitude,
    depthKm: Number.parseFloat(raw.Kedalaman ?? "") || 0,
    region: raw.Wilayah?.trim() ?? "",
    potential: raw.Potensi?.trim() || null,
    felt: raw.Dirasakan?.trim() || null,
    tsunamiPotential: hasTsunamiPotential(raw.Potensi),
    shakemapUrl: raw.Shakemap ? `${BMKG_BASE_URL}/${encodeURIComponent(raw.Shakemap)}` : null,
  }
}

export function parseBmkgFeed(payload: unknown): Earthquake[] {
  const gempa = (payload as BmkgPayload)?.Infogempa?.gempa
  const list = Array.isArray(gempa) ? gempa : gempa ? [gempa] : []
  return list
    .map(normalizeQuake)
    .filter((q): q is Earthquake => q !== null)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

async function fetchFeed(name: "autogempa" | "gempaterkini" | "gempadirasakan"): Promise<Earthquake[]> {
  const response = await fetch(`${BMKG_BASE_URL}/${name}.json`, {
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`BMKG (${name}) mengembalikan status ${response.status}`)
  }
  return parseBmkgFeed(await response.json())
}

export async function getEarthquakes(): Promise<EarthquakesResponse> {
  return cached("bmkg:earthquakes", CACHE_TTL_MS, async () => {
    const [latest, recent, felt] = await Promise.all([
      fetchFeed("autogempa"),
      fetchFeed("gempaterkini"),
      fetchFeed("gempadirasakan"),
    ])
    return {
      source: {
        name: "BMKG",
        url: "https://data.bmkg.go.id/gempabumi/",
        fetchedAt: new Date().toISOString(),
      },
      latest: latest[0] ?? null,
      recent,
      felt,
    }
  })
}
