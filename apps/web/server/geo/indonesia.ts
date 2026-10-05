import "server-only"
import type { IslandGroup } from "@/lib/data/types"
import { isInIndonesiaBbox } from "@/lib/geo"
import provincesData from "./indonesia-provinces.json"

export interface ProvinceInfo {
  iso: string
  name: string
  island: IslandGroup
}

// Nama resmi berbahasa Indonesia per kode ISO 3166-2:ID. Batas wilayah dari
// geoBoundaries (2017) masih 34 provinsi: "Papua" mencakup Papua Selatan,
// Papua Tengah & Papua Pegunungan, "Papua Barat" mencakup Papua Barat Daya
// (pemekaran 2022).
export const PROVINCES: Record<string, ProvinceInfo> = {
  "ID-AC": { iso: "ID-AC", name: "Aceh", island: "Sumatera" },
  "ID-SU": { iso: "ID-SU", name: "Sumatera Utara", island: "Sumatera" },
  "ID-SB": { iso: "ID-SB", name: "Sumatera Barat", island: "Sumatera" },
  "ID-RI": { iso: "ID-RI", name: "Riau", island: "Sumatera" },
  "ID-KR": { iso: "ID-KR", name: "Kepulauan Riau", island: "Sumatera" },
  "ID-JA": { iso: "ID-JA", name: "Jambi", island: "Sumatera" },
  "ID-SS": { iso: "ID-SS", name: "Sumatera Selatan", island: "Sumatera" },
  "ID-BB": { iso: "ID-BB", name: "Kepulauan Bangka Belitung", island: "Sumatera" },
  "ID-BE": { iso: "ID-BE", name: "Bengkulu", island: "Sumatera" },
  "ID-LA": { iso: "ID-LA", name: "Lampung", island: "Sumatera" },
  "ID-BT": { iso: "ID-BT", name: "Banten", island: "Jawa" },
  "ID-JK": { iso: "ID-JK", name: "DKI Jakarta", island: "Jawa" },
  "ID-JB": { iso: "ID-JB", name: "Jawa Barat", island: "Jawa" },
  "ID-JT": { iso: "ID-JT", name: "Jawa Tengah", island: "Jawa" },
  "ID-YO": { iso: "ID-YO", name: "DI Yogyakarta", island: "Jawa" },
  "ID-JI": { iso: "ID-JI", name: "Jawa Timur", island: "Jawa" },
  "ID-BA": { iso: "ID-BA", name: "Bali", island: "Bali & Nusa Tenggara" },
  "ID-NB": { iso: "ID-NB", name: "Nusa Tenggara Barat", island: "Bali & Nusa Tenggara" },
  "ID-NT": { iso: "ID-NT", name: "Nusa Tenggara Timur", island: "Bali & Nusa Tenggara" },
  "ID-KB": { iso: "ID-KB", name: "Kalimantan Barat", island: "Kalimantan" },
  "ID-KT": { iso: "ID-KT", name: "Kalimantan Tengah", island: "Kalimantan" },
  "ID-KS": { iso: "ID-KS", name: "Kalimantan Selatan", island: "Kalimantan" },
  "ID-KI": { iso: "ID-KI", name: "Kalimantan Timur", island: "Kalimantan" },
  "ID-KU": { iso: "ID-KU", name: "Kalimantan Utara", island: "Kalimantan" },
  "ID-SA": { iso: "ID-SA", name: "Sulawesi Utara", island: "Sulawesi" },
  "ID-GO": { iso: "ID-GO", name: "Gorontalo", island: "Sulawesi" },
  "ID-ST": { iso: "ID-ST", name: "Sulawesi Tengah", island: "Sulawesi" },
  "ID-SR": { iso: "ID-SR", name: "Sulawesi Barat", island: "Sulawesi" },
  "ID-SN": { iso: "ID-SN", name: "Sulawesi Selatan", island: "Sulawesi" },
  "ID-SG": { iso: "ID-SG", name: "Sulawesi Tenggara", island: "Sulawesi" },
  "ID-MA": { iso: "ID-MA", name: "Maluku", island: "Maluku" },
  "ID-MU": { iso: "ID-MU", name: "Maluku Utara", island: "Maluku" },
  "ID-PA": { iso: "ID-PA", name: "Papua", island: "Papua" },
  "ID-PB": { iso: "ID-PB", name: "Papua Barat", island: "Papua" },
}

type BBox = [minLng: number, minLat: number, maxLng: number, maxLat: number]

interface ProvinceShape {
  iso: string
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

