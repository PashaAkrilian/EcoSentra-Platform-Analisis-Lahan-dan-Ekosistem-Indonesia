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
