import type { LandCoverResult, NdviResponse, ScenarioCategory, WeatherResponse } from "@/lib/data/types"
import type { NearbyHotspots } from "@/lib/geo"
import { ndviTrend } from "@/lib/ndvi"

export interface Recommendation {
  level: "tindakan" | "perhatian" | "info"
  title: string
  detail: string
}

export interface RecommendationInput {
  category: ScenarioCategory
  landcover: LandCoverResult | null
  ndvi: NdviResponse | null
  weather: WeatherResponse | null
  /** Titik api 24 jam di sekitar lokasi (lihat nearbyHotspots). */
  nearby: NearbyHotspots | null
}

const LEVEL_ORDER = { tindakan: 0, perhatian: 1, info: 2 } as const

// Ambang di bawah ini heuristik EcoSentra yang transparan (dijelaskan di UI) —
// bukan standar resmi. Tujuannya mengarahkan perhatian, bukan memutuskan.
const DRY_FORECAST_MM_3D = 5
const DRY_SOIL = 0.2 // m³/m³ lapisan 0–1 cm (model)
const HEAVY_RAIN_MM_3D = 60
const HOT_C = 36
const NDVI_DROP = -0.1
const BUILT_UP_PRESSURE_PCT = 30
const LOW_CROPLAND_PCT = 30

const share = (landcover: LandCoverResult | null, code: number) => landcover?.classes.find((c) => c.code === code)?.percentage ?? 0

export function recommend({ category, landcover, ndvi, weather, nearby }: RecommendationInput): Recommendation[] {
  const out: Recommendation[] = []

  // --- Titik api di sekitar ---
  if (nearby) {
    const close = nearby.within[5] ?? 0
    const mid = nearby.within[25] ?? 0
    if (close > 0) {
      out.push({
        level: "tindakan",
        title: "Titik api sangat dekat",
        detail: `${close} titik api dalam 5 km (terdekat ${nearby.nearestKm!.toFixed(1)} km) dalam 24 jam terakhir. Verifikasi kondisi di lapangan dan koordinasikan dengan BPBD/Manggala Agni setempat.`,
      })
    } else if (mid >= 5) {
      out.push({
        level: "perhatian",
        title: "Banyak titik api di sekitar",
        detail: `${mid} titik api dalam 25 km. Pantau perkembangannya di peta dan siapkan langkah pencegahan (sekat bakar, sumber air).`,
      })
    } else {
      out.push({ level: "info", title: "Tidak ada titik api dekat", detail: `${mid === 0 ? "Tidak ada" : `Hanya ${mid}`} titik api dalam 25 km pada 24 jam terakhir.` })
    }
  }

  // --- Cuaca ---
  if (weather) {
    const next3 = weather.daily.slice(0, 3)
    const rain3 = next3.reduce((sum, d) => sum + d.precipitationMm, 0)
    const soil = weather.current.soilMoisture
    if (rain3 < DRY_FORECAST_MM_3D && soil !== null && soil < DRY_SOIL) {
      out.push({
        level: "perhatian",
        title: "Kering dan minim hujan",
        detail:
          category === "pertanian"
            ? `Prakiraan hujan 3 hari hanya ${rain3.toFixed(1)} mm dan kelembapan tanah (model) ${(soil * 100).toFixed(0)}%. Pertimbangkan penjadwalan irigasi.`
            : `Prakiraan hujan 3 hari hanya ${rain3.toFixed(1)} mm dan tanah kering (model ${(soil * 100).toFixed(0)}%) — risiko kebakaran lahan meningkat.`,
      })
    }
    if (rain3 >= HEAVY_RAIN_MM_3D) {
      out.push({
        level: "perhatian",
        title: "Hujan lebat diperkirakan",
        detail: `Akumulasi hujan 3 hari ±${rain3.toFixed(0)} mm. Periksa drainase dan waspadai genangan atau longsor di lahan miring.`,
      })
    }
    const maxTemp = Math.max(...next3.map((d) => d.tempMaxC))
    if (maxTemp >= HOT_C) {
      out.push({ level: "info", title: "Suhu tinggi", detail: `Suhu maksimum hingga ${Math.round(maxTemp)}°C dalam 3 hari — batasi pekerjaan lapangan di siang hari.` })
    }
  }

  // --- NDVI ---
  if (ndvi) {
    const reliable = ndvi.observations.filter((o) => o.quality === "baik" || o.quality === "marginal").map((o) => o.ndvi)
    const trend = ndviTrend(reliable)
    if (trend && trend.delta <= NDVI_DROP) {
      out.push({
        level: "perhatian",
        title: "NDVI turun",
        detail:
          category === "pertanian"
            ? `NDVI turun ${Math.abs(trend.delta).toFixed(2)} dibanding komposit sebelumnya. Periksa kecukupan air, hama/penyakit, atau fase panen; bandingkan dengan lahan sekitar.`
            : `NDVI turun ${Math.abs(trend.delta).toFixed(2)} dibanding komposit sebelumnya. Periksa kemungkinan pembukaan lahan, kebakaran, atau gangguan vegetasi.`,
      })
    } else if (!ndvi.latest) {
      out.push({ level: "info", title: "NDVI belum andal", detail: "Observasi terbaru tertutup awan; interpretasi vegetasi sebaiknya menunggu komposit berikutnya." })
    }
  }

  // --- Tutupan lahan ---
  if (landcover) {
    const trees = share(landcover, 2)
    const built = share(landcover, 7)
    const crops = share(landcover, 5)
    if ((category === "konservasi" || category === "kehutanan") && built >= BUILT_UP_PRESSURE_PCT) {
      out.push({
        level: "perhatian",
        title: "Tekanan area terbangun tinggi",
        detail: `${built.toFixed(0)}% area dalam radius analisis adalah area terbangun — ruang untuk vegetasi alami terbatas.`,
      })
    }
    if (category === "pertanian" && crops < LOW_CROPLAND_PCT) {
      out.push({
        level: "info",
        title: "Tutupan pertanian rendah di lokasi",
        detail: `Hanya ${crops.toFixed(0)}% area berklasifikasi tanaman pertanian (dominan: ${landcover.dominantClass}). Pastikan koordinat lokasi tepat.`,
      })
    }
    if (category === "konservasi" || category === "kehutanan") {
      out.push({ level: "info", title: "Tutupan pohon", detail: `${trees.toFixed(0)}% area dalam radius analisis berklasifikasi pepohonan (termasuk kebun berpohon).` })
    }
  }

  return out.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])
}
