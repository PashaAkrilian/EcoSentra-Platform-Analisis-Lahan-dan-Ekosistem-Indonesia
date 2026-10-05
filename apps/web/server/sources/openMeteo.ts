import "server-only"
import { cached } from "@/server/cache"
import type { WeatherResponse } from "@/lib/data/types"

/**
 * Open-Meteo — prakiraan & kondisi cuaca terkini (https://open-meteo.com),
 * gratis tanpa API key untuk penggunaan non-komersial, lisensi data CC BY 4.0.
 * Kelembapan tanah adalah keluaran model cuaca, bukan pengukuran sensor.
 */
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
const CACHE_TTL_MS = 15 * 60 * 1000
const FETCH_TIMEOUT_MS = 15_000

// Kode cuaca WMO (https://open-meteo.com/en/docs#weathervariables).
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Cerah",
  1: "Cerah berawan",
  2: "Berawan sebagian",
  3: "Berawan tebal",
  45: "Berkabut",
  48: "Kabut beku",
  51: "Gerimis ringan",
  53: "Gerimis sedang",
  55: "Gerimis lebat",
  56: "Gerimis beku ringan",
  57: "Gerimis beku lebat",
  61: "Hujan ringan",
  63: "Hujan sedang",
  65: "Hujan lebat",
  66: "Hujan beku ringan",
  67: "Hujan beku lebat",
  71: "Salju ringan",
  73: "Salju sedang",
  75: "Salju lebat",
  77: "Butiran salju",
  80: "Hujan lokal ringan",
  81: "Hujan lokal sedang",
  82: "Hujan lokal sangat lebat",
  85: "Salju lokal ringan",
  86: "Salju lokal lebat",
  95: "Badai petir",
  96: "Badai petir dengan hujan es ringan",
  99: "Badai petir dengan hujan es lebat",
}

export function describeWeatherCode(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? "Tidak diketahui"
}

interface OpenMeteoPayload {
  timezone?: string
  utc_offset_seconds?: number
  current?: {
    time: string
    temperature_2m: number
    relative_humidity_2m: number
    precipitation: number
    weather_code: number
    wind_speed_10m: number
    soil_moisture_0_to_1cm?: number | null
  }
  daily?: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
  }
}

/** "2026-10-05T20:00" (waktu lokal) + offset detik -> ISO 8601 UTC. */
function localToIsoUtc(localTime: string, utcOffsetSeconds: number): string {
  return new Date(Date.parse(`${localTime}:00Z`) - utcOffsetSeconds * 1000).toISOString()
}

export function parseOpenMeteo(payload: OpenMeteoPayload, lat: number, lng: number): Omit<WeatherResponse, "source"> {
  const current = payload.current
  const daily = payload.daily
  if (!current || !daily) {
    throw new Error("Respons Open-Meteo tidak lengkap.")
  }

  return {
    lat,
    lng,
    timezone: payload.timezone ?? "UTC",
    current: {
      time: localToIsoUtc(current.time, payload.utc_offset_seconds ?? 0),
      temperatureC: current.temperature_2m,
      humidityPct: current.relative_humidity_2m,
      precipitationMm: current.precipitation,
      windSpeedKmh: current.wind_speed_10m,
      weatherCode: current.weather_code,
      description: describeWeatherCode(current.weather_code),
      soilMoisture: current.soil_moisture_0_to_1cm ?? null,
    },
    daily: daily.time.map((date, i) => ({
      date,
      tempMaxC: daily.temperature_2m_max[i]!,
      tempMinC: daily.temperature_2m_min[i]!,
      precipitationMm: daily.precipitation_sum[i]!,
      weatherCode: daily.weather_code[i]!,
      description: describeWeatherCode(daily.weather_code[i]!),
    })),
  }
}

export async function getWeather(lat: number, lng: number): Promise<WeatherResponse> {
  // Dibulatkan ke 2 desimal (~1 km) supaya klik berdekatan berbagi cache.
  const rLat = Math.round(lat * 100) / 100
  const rLng = Math.round(lng * 100) / 100

  return cached(`open-meteo:${rLat},${rLng}`, CACHE_TTL_MS, async () => {
    const params = new URLSearchParams({
      latitude: String(rLat),
      longitude: String(rLng),
      current:
        "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,soil_moisture_0_to_1cm",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
      timezone: "auto",
      forecast_days: "7",
    })
    const response = await fetch(`${OPEN_METEO_URL}?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`Open-Meteo mengembalikan status ${response.status}`)
    }
    return {
      source: { name: "Open-Meteo", url: "https://open-meteo.com", fetchedAt: new Date().toISOString() },
      ...parseOpenMeteo(await response.json(), rLat, rLng),
    }
  })
}
