// Bentuk data ini adalah kontrak antara API routes (app/api/*) dan UI —
// cocokkan dengan docs/api.md setiap kali salah satu diubah.

export interface DataSourceInfo {
  name: string
  url: string
  /** Kapan server terakhir mengambil data dari sumber (ISO 8601). */
  fetchedAt: string
}

// --- Titik api (NASA FIRMS) -------------------------------------------------

export const HOTSPOT_RANGES = ["24h", "48h", "7d"] as const
export type HotspotRange = (typeof HOTSPOT_RANGES)[number]

export type FireConfidence = "low" | "nominal" | "high"

export type IslandGroup =
  | "Sumatera"
  | "Jawa"
  | "Kalimantan"
  | "Sulawesi"
  | "Bali & Nusa Tenggara"
  | "Maluku"
  | "Papua"

export interface FireHotspot {
  lat: number
  lng: number
  /** Brightness temperature kanal I-4 (Kelvin). */
  brightnessK: number
  /** Fire Radiative Power (megawatt). */
  frpMw: number
  confidence: FireConfidence
  /** Waktu akuisisi satelit (ISO 8601, UTC). */
  acquiredAt: string
  daynight: "D" | "N"
  provinceIso: string
  provinceName: string
  island: IslandGroup
}

export interface ProvinceHotspotCount {
  iso: string
  name: string
  island: IslandGroup
  count: number
  highConfidence: number
  /** Rata-rata koordinat titik api di provinsi ini — pusat aktivitas api, untuk tautan peta. */
  center: LatLng
}

export interface HotspotSummary {
  source: DataSourceInfo & { satellite: string }
  range: HotspotRange
  total: number
  highConfidence: number
  /** Waktu deteksi terbaru (ISO 8601) atau null kalau tidak ada titik api. */
  latestAcquiredAt: string | null
  byProvince: ProvinceHotspotCount[]
  byIsland: { island: IslandGroup; count: number }[]
  /** Jumlah per hari kalender WIB (UTC+7), urut naik. */
  byDay: { date: string; count: number }[]
}

// --- Gempa bumi (BMKG) ------------------------------------------------------

export type EarthquakeFeed = "terkini" | "dirasakan"

export interface Earthquake {
  id: string
  /** Waktu kejadian (ISO 8601, UTC). */
  occurredAt: string
  lat: number
  lng: number
  magnitude: number
  depthKm: number
  /** Deskripsi wilayah dari BMKG, mis. "68 km BaratDaya CALANG-ACEHJAYA". */
  region: string
  /** Teks potensi tsunami dari BMKG (hanya ada di feed "terkini"). */
  potential: string | null
  /** Skala MMI wilayah yang merasakan (hanya ada di feed "dirasakan"). */
  felt: string | null
  tsunamiPotential: boolean
  shakemapUrl: string | null
}

export interface EarthquakesResponse {
  source: DataSourceInfo
  latest: Earthquake | null
  recent: Earthquake[]
  felt: Earthquake[]
}

// --- Cuaca (Open-Meteo) -----------------------------------------------------

export interface WeatherCurrent {
  time: string
  temperatureC: number
  humidityPct: number
  precipitationMm: number
  windSpeedKmh: number
  weatherCode: number
  description: string
  /** Kelembapan tanah 0-1 cm (m³/m³, keluaran model — bukan sensor lapangan). */
  soilMoisture: number | null
}

export interface WeatherDaily {
  date: string
  tempMaxC: number
  tempMinC: number
  precipitationMm: number
  weatherCode: number
  description: string
}

export interface WeatherResponse {
  source: DataSourceInfo
  lat: number
  lng: number
  timezone: string
  current: WeatherCurrent
  daily: WeatherDaily[]
}

// --- NDVI (MODIS MOD13Q1 via ORNL DAAC) -------------------------------------

export interface NdviObservation {
  /** Tanggal awal komposit 16 hari (YYYY-MM-DD). */
  date: string
  ndvi: number
  /** Dari band pixel_reliability MOD13Q1 — "berawan" berarti nilai NDVI tidak bisa dipercaya. */
  quality: "baik" | "marginal" | "salju/es" | "berawan" | "tidak diketahui"
}

export interface NdviResponse {
  source: DataSourceInfo & { product: string; resolutionM: number }
  lat: number
  lng: number
  observations: NdviObservation[]
  /** Observasi terbaru berkualitas baik/marginal. */
  latest: NdviObservation | null
}

// --- Tutupan lahan ----------------------------------------------------------

export interface LandCoverClass {
  name: string
  code: number
  percentage: number
  /** Warna legenda resmi dataset (hex). */
  color: string
}

export interface LandCoverResult {
  source: DataSourceInfo & { dataset: string; year: number; resolutionM: number }
  lat: number
  lng: number
  bufferMeters: number
  areaHa: number
  dominantClass: string
  classes: LandCoverClass[]
}

// --- Ringkasan dashboard ----------------------------------------------------

export interface FieldsSummary {
  totalFields: number
  totalAreaHa: number
  analyzedFields: number
}

// --- Data milik user (Firestore) --------------------------------------------

export interface LatLng {
  lat: number
  lng: number
}

export interface Field {
  id: string
  name: string
  cropType: string
  areaHa: number
  plantingDate: string | null
  location: LatLng
  notes: string
  createdAt: string | null
  updatedAt: string | null
  /** Ringkasan analisis tutupan lahan terakhir (kalau pernah dianalisis). */
  lastAnalysis: { dominantClass: string; dataset: string; analyzedAt: string } | null
}

export interface LandCoverSnapshot extends Omit<LandCoverResult, "source"> {
  id: string
  fieldId: string | null
  dataset: string
  year: number
  createdAt: string | null
}

export type ScenarioCategory = "pertanian" | "kehutanan" | "kebencanaan" | "konservasi"
export type ScenarioStatus = "draf" | "berjalan" | "selesai"
export type ScenarioPriority = "rendah" | "sedang" | "tinggi"

export interface Scenario {
  id: string
  title: string
  description: string
  category: ScenarioCategory
  status: ScenarioStatus
  priority: ScenarioPriority
  location: LatLng | null
  deadline: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface Alert {
  id: string
  type: "kebakaran" | "banjir" | "kekeringan" | "longsor" | "gempa" | "lainnya"
  severity: "rendah" | "sedang" | "tinggi" | "kritis"
  title: string
  description: string
  location: LatLng
  regionName: string
  status: "aktif" | "dipantau" | "selesai"
  createdAt: string | null
}

export interface UserProfile {
  uid: string
  displayName: string
  organization: string
  email: string | null
  isAdmin: boolean
}

// --- Format ringkas titik api untuk peta ------------------------------------

/**
 * Titik api ringkas untuk peta (array, bukan objek, supaya payload ±4x lebih
 * kecil): [lat, lng, frpMw, confidence (0 rendah, 1 nominal, 2 tinggi),
 * waktu akuisisi (epoch detik UTC), kode ISO provinsi].
 */
export type CompactHotspot = [
  lat: number,
  lng: number,
  frpMw: number,
  confidence: 0 | 1 | 2,
  acquiredAtEpochSec: number,
  provinceIso: string,
]

export interface HotspotPointsResponse extends HotspotSummary {
  points: CompactHotspot[]
}

// --- Profil ekosistem provinsi ----------------------------------------------

export interface ProvinceLandCover {
  source: DataSourceInfo & { dataset: string; year: number; sampleResolutionM: number }
  iso: string
  name: string
  island: IslandGroup
  areaKm2: number
  classes: LandCoverClass[]
}
