import type { IslandGroup } from "@/lib/data/types"
import meta from "./province-meta.json"

// Daftar provinsi — modul ini aman dipakai di klien maupun server
// (data poligon ada di server/geo/indonesia.ts, khusus server).

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

export const PROVINCE_NAMES: Record<string, string> = Object.fromEntries(
  Object.values(PROVINCES).map((p) => [p.iso, p.name]),
)

export function provinceName(iso: string): string {
  return PROVINCE_NAMES[iso] ?? iso
}

const PROVINCE_META = meta as Record<string, { bbox: number[]; areaKm2: number }>

/** Kotak pembatas provinsi sebagai [[lat, lng], [lat, lng]] (barat-daya, timur-laut) untuk fitBounds Leaflet. */
export function provinceBounds(iso: string): [[number, number], [number, number]] | null {
  const box = PROVINCE_META[iso]?.bbox
  return box ? [[box[1]!, box[0]!], [box[3]!, box[2]!]] : null
}

/** Luas provinsi (km²) dari batas geoBoundaries yang sama dengan klasifikasi titik api. */
export function provinceAreaKm2(iso: string): number | null {
  return PROVINCE_META[iso]?.areaKm2 ?? null
}

/** Daftar provinsi urut nama, untuk pemilih (select) di UI. */
export const PROVINCE_OPTIONS = Object.values(PROVINCES).sort((a, b) => a.name.localeCompare(b.name, "id"))
