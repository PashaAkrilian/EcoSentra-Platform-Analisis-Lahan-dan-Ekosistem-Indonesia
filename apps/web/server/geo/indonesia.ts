import "server-only"
import { isInIndonesiaBbox } from "@/lib/geo"
import { PROVINCES, type ProvinceInfo } from "@/lib/provinces"
import provincesData from "./indonesia-provinces.json"

export { PROVINCES, type ProvinceInfo }

type BBox = [minLng: number, minLat: number, maxLng: number, maxLat: number]

interface ProvinceShape {
  iso: string
  areaKm2: number
  bbox: BBox
  // polygons[i][0] = ring luar, polygons[i][1..] = lubang; tiap ring = [lng, lat, lng, lat, ...]
  polygons: number[][][]
}

function ringBBox(ring: number[]): BBox {
  const box: BBox = [Infinity, Infinity, -Infinity, -Infinity]
  for (let i = 0; i < ring.length; i += 2) {
    box[0] = Math.min(box[0], ring[i]!)
    box[1] = Math.min(box[1], ring[i + 1]!)
    box[2] = Math.max(box[2], ring[i]!)
    box[3] = Math.max(box[3], ring[i + 1]!)
  }
  return box
}

// Bbox per poligon dihitung sekali saat modul dimuat — provinsi kepulauan
// (Maluku, Kepri, NTT) punya ratusan poligon pulau, jadi tanpa ini tiap titik
// harus di-ray-cast ke semua pulau tersebut.
const SHAPES = (provincesData as unknown as { provinces: ProvinceShape[] }).provinces.map((shape) => ({
  ...shape,
  polygons: shape.polygons.map((rings) => ({ rings, bbox: ringBBox(rings[0] ?? []) })),
}))

function inBBox([minLng, minLat, maxLng, maxLat]: BBox, lng: number, lat: number): boolean {
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
}

/** Ray casting pada ring datar [lng, lat, lng, lat, ...]. */
function ringContains(ring: number[], lng: number, lat: number): boolean {
  let inside = false
  const n = ring.length / 2
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i * 2]!
    const yi = ring[i * 2 + 1]!
    const xj = ring[j * 2]!
    const yj = ring[j * 2 + 1]!
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function polygonContains(polygon: number[][], lng: number, lat: number): boolean {
  const [outer, ...holes] = polygon
  if (!outer || !ringContains(outer, lng, lat)) return false
  return !holes.some((hole) => ringContains(hole, lng, lat))
}

/**
 * Provinsi tempat titik berada, atau `null` kalau di luar daratan Indonesia
 * (laut, negara tetangga, atau pulau sangat kecil < ~1 km² yang dibuang saat
 * penyederhanaan batas wilayah).
 */
export function findProvince(lat: number, lng: number): ProvinceInfo | null {
  if (!isInIndonesiaBbox(lat, lng)) return null
  for (const shape of SHAPES) {
    if (!inBBox(shape.bbox, lng, lat)) continue
    if (shape.polygons.some((p) => inBBox(p.bbox, lng, lat) && polygonContains(p.rings, lng, lat))) {
      return PROVINCES[shape.iso] ?? null
    }
  }
  return null
}


export function provinceAreaKm2(iso: string): number | null {
  return SHAPES.find((shape) => shape.iso === iso)?.areaKm2 ?? null
}

/** Daftar 34 provinsi (urut nama) beserta luas — untuk pemilih provinsi di UI. */
export function listProvinces(): (ProvinceInfo & { areaKm2: number })[] {
  return SHAPES.map((shape) => ({ ...PROVINCES[shape.iso]!, areaKm2: shape.areaKm2 })).sort((a, b) =>
    a.name.localeCompare(b.name, "id"),
  )
}

/** Poligon luar & lubang suatu provinsi sebagai ring [[lng, lat], ...] — untuk query ke layanan eksternal. */
export function provincePolygons(iso: string): number[][][][] | null {
  const shape = SHAPES.find((s) => s.iso === iso)
  if (!shape) return null
  return shape.polygons.map(({ rings }) =>
    rings.map((flat) => {
      const ring: number[][] = []
      for (let i = 0; i < flat.length; i += 2) ring.push([flat[i]!, flat[i + 1]!])
      return ring
    }),
  )
}

/** GeoJSON FeatureCollection seluruh provinsi, untuk layer batas di peta. */
export function provincesGeoJson() {
  return {
    type: "FeatureCollection" as const,
    features: SHAPES.map((shape) => {
      const info = PROVINCES[shape.iso]!
      return {
        type: "Feature" as const,
        properties: { iso: info.iso, name: info.name, island: info.island, areaKm2: shape.areaKm2 },
        geometry: { type: "MultiPolygon" as const, coordinates: provincePolygons(shape.iso)! },
      }
    }),
  }
}
