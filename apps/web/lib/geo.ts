/** Kotak pembatas kasar wilayah Indonesia (derajat WGS84). */
export const INDONESIA_BBOX = { minLng: 94.5, minLat: -11.5, maxLng: 141.5, maxLat: 6.5 } as const

/** Titik tengah & zoom awal peta seluruh Indonesia. */
export const INDONESIA_CENTER = { lat: -2.5, lng: 118 } as const

export function isInIndonesiaBbox(lat: number, lng: number): boolean {
  return (
    lng >= INDONESIA_BBOX.minLng &&
    lng <= INDONESIA_BBOX.maxLng &&
    lat >= INDONESIA_BBOX.minLat &&
    lat <= INDONESIA_BBOX.maxLat
  )
}

/** Format koordinat untuk tampilan, mis. "6.2088° LS, 106.8456° BT". */
export function formatLatLng(lat: number, lng: number, digits = 4): string {
  const ns = lat < 0 ? "LS" : "LU"
  const ew = lng < 0 ? "BB" : "BT"
  return `${Math.abs(lat).toFixed(digits)}° ${ns}, ${Math.abs(lng).toFixed(digits)}° ${ew}`
}

/** Jarak great-circle (km) antara dua titik. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export interface NearbyHotspots {
  /** Titik api terdekat (km) atau null kalau tidak ada data. */
  nearestKm: number | null
  /** Jumlah titik api dalam tiap radius (km). */
  within: Record<number, number>
  /** Daftar titik api terdekat, urut jarak. */
  nearest: { lat: number; lng: number; km: number; frpMw: number; confidence: 0 | 1 | 2; acquiredAtEpochSec: number }[]
}

/**
 * Hitung titik api di sekitar sebuah titik dari format ringkas
 * [lat, lng, frp, confidence, epochSec, provinceIso]. Prefilter kotak kasar
 * dulu supaya 13 ribu titik tidak semuanya dihitung haversine.
 */
export function nearbyHotspots(
  points: readonly (readonly [number, number, number, 0 | 1 | 2, number, string])[],
  center: { lat: number; lng: number },
  radiiKm: number[] = [5, 10, 25],
  listSize = 5,
): NearbyHotspots {
  const maxRadius = Math.max(...radiiKm)
  const dLat = maxRadius / 111.32
  const dLng = maxRadius / (111.32 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180)))

  const within = Object.fromEntries(radiiKm.map((r) => [r, 0])) as Record<number, number>
  const found: NearbyHotspots["nearest"] = []

  for (const [lat, lng, frpMw, confidence, acquiredAtEpochSec] of points) {
    if (Math.abs(lat - center.lat) > dLat || Math.abs(lng - center.lng) > dLng) continue
    const km = distanceKm(center, { lat, lng })
    if (km > maxRadius) continue
    for (const r of radiiKm) if (km <= r) within[r]!++
    found.push({ lat, lng, km, frpMw, confidence, acquiredAtEpochSec })
  }

  found.sort((a, b) => a.km - b.km)
  return { nearestKm: found[0]?.km ?? null, within, nearest: found.slice(0, listSize) }
}

export const MIN_BUFFER_METERS = 100
export const MAX_BUFFER_METERS = 50_000

/** Radius lingkaran yang luasnya sama dengan luas lahan (dibatasi 100 m - 50 km). */
export function bufferForArea(areaHa: number): number {
  const radius = Math.round(Math.sqrt((areaHa * 10_000) / Math.PI))
  return Math.min(MAX_BUFFER_METERS, Math.max(MIN_BUFFER_METERS, radius))
}
