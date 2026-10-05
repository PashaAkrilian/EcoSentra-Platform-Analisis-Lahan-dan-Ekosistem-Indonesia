import { beforeEach, describe, expect, it, vi } from "vitest"
import type { FireHotspot, LandCoverResult, NdviResponse, WeatherResponse } from "@/lib/data/types"

const getHotspotDataset = vi.fn()
const getWeather = vi.fn()
const getNdviSeries = vi.fn()
const analyzeLandCover = vi.fn()

vi.mock("@/server/sources/firms", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/sources/firms")>()),
  getHotspotDataset: (...args: unknown[]) => getHotspotDataset(...args),
}))
vi.mock("@/server/sources/openMeteo", () => ({ getWeather: (...args: unknown[]) => getWeather(...args) }))
vi.mock("@/server/sources/modisNdvi", () => ({ getNdviSeries: (...args: unknown[]) => getNdviSeries(...args) }))
vi.mock("@/server/sources/landcover", () => ({ analyzeLandCover: (...args: unknown[]) => analyzeLandCover(...args) }))

const { executeTool } = await import("@/server/assistant/tools")

const CENTER = { lat: -2.2136, lng: 113.9108 }
const source = { name: "Uji", url: "https://example.test", fetchedAt: "2026-10-05T19:00:00.000Z" }

const hotspot = (lat: number, lng: number): FireHotspot => ({
  lat,
  lng,
  brightnessK: 330,
  frpMw: 3.2,
  confidence: "high",
  acquiredAt: "2026-10-05T07:00:00.000Z",
  daynight: "D",
  provinceIso: "ID-KT",
  provinceName: "Kalimantan Tengah",
  island: "Kalimantan",
})

// ±3,7 km, ±8 km, ±20 km ke utara titik uji, dan satu titik jauh di Jawa.
const dataset = {
  range: "24h",
  url: "https://example.test/firms.csv",
  satellite: "VIIRS_SNPP_NRT",
  fetchedAt: "2026-10-05T19:00:00.000Z",
  hotspots: [hotspot(-2.1804, 113.9108), hotspot(-2.1417, 113.9108), hotspot(-2.0336, 113.9108), hotspot(-6.2, 106.8)],
}

const dryWeather: WeatherResponse = {
  source,
  lat: CENTER.lat,
  lng: CENTER.lng,
  timezone: "Asia/Pontianak",
  current: { time: "2026-10-06T09:00", temperatureC: 31, humidityPct: 70, precipitationMm: 0, windSpeedKmh: 6, weatherCode: 1, description: "Cerah", soilMoisture: 0.12 },
  daily: ["2026-10-06", "2026-10-07", "2026-10-08"].map((date) => ({ date, tempMaxC: 34, tempMinC: 24, precipitationMm: 0.1, weatherCode: 1, description: "Cerah" })),
}

const ndvi: NdviResponse = {
  source: { ...source, product: "MOD13Q1", resolutionM: 250 },
  lat: CENTER.lat,
  lng: CENTER.lng,
  observations: [
    { date: "2026-07-28", ndvi: 0.62, quality: "baik" },
    { date: "2026-08-13", ndvi: 0.6, quality: "baik" },
  ],
  latest: { date: "2026-08-13", ndvi: 0.6, quality: "baik" },
}

const landcover: LandCoverResult = {
  source: { ...source, dataset: "Sentinel-2 10m LULC", year: 2025, resolutionM: 10 },
  lat: CENTER.lat,
  lng: CENTER.lng,
  bufferMeters: 1000,
  areaHa: 314,
  dominantClass: "Area terbangun",
  classes: [{ name: "Area terbangun", code: 7, percentage: 100, color: "#c4281b" }],
}

beforeEach(() => {
  getHotspotDataset.mockReset().mockResolvedValue(dataset)
  getWeather.mockReset().mockResolvedValue(dryWeather)
  getNdviSeries.mockReset().mockResolvedValue(ndvi)
  analyzeLandCover.mockReset().mockResolvedValue(landcover)
})

describe("get_fire_hotspots dengan koordinat", () => {
  it("menghitung titik api per radius dan yang terdekat dari seluruh data nasional", async () => {
    const result = (await executeTool("get_fire_hotspots", { ...CENTER, range: "24h" })) as Record<string, any>

    expect(result.total).toBe(4) // ringkasan nasional tetap ada
    expect(result.nearby.withinKm).toEqual({ "5": 1, "10": 2, "25": 3 })
    expect(result.nearby.nearestKm).toBe(3.7)
    expect(result.nearby.nearest[0]).toMatchObject({ km: 3.7, confidence: "tinggi" })
    expect(result.nearby.source).toBe("NASA FIRMS")
  })

  it("tanpa koordinat tidak ada blok nearby", async () => {
    const result = (await executeTool("get_fire_hotspots", { range: "24h" })) as Record<string, unknown>
    expect(result).not.toHaveProperty("nearby")
  })

  it("lat tanpa lng, atau koordinat di luar Indonesia, ditolak", async () => {
    await expect(executeTool("get_fire_hotspots", { lat: -2.2 })).rejects.toThrow(/lat dan lng harus diisi bersamaan/)
    await expect(executeTool("get_fire_hotspots", { lat: 48.85, lng: 2.35 })).rejects.toThrow(/Input tidak valid/)
  })
})

describe("get_location_briefing", () => {
  it("menggabungkan titik api sekitar, cuaca, NDVI, tutupan lahan, dan rekomendasi aturan", async () => {
    const result = (await executeTool("get_location_briefing", CENTER)) as Record<string, any>

    expect(result.category).toBe("kebencanaan")
    expect(result.unavailable).toEqual([])
    expect(result.fire.withinKm["5"]).toBe(1)
    expect(result.weather.current.description).toBe("Cerah")
    expect(result.ndvi.latestReliable.ndvi).toBe(0.6)
    expect(result.landCover.dominantClass).toBe("Area terbangun")
    expect(analyzeLandCover).toHaveBeenCalledWith(CENTER.lat, CENTER.lng, 1000)

    const titles = (result.recommendations as { level: string; title: string }[]).map((r) => `${r.level}:${r.title}`)
    expect(titles).toContain("tindakan:Titik api sangat dekat")
    expect(titles).toContain("perhatian:Kering dan minim hujan")
    expect(titles[0]).toMatch(/^tindakan:/) // diurutkan dari yang paling mendesak
  })

  it("satu sumber gagal -> bagian itu null dan dicantumkan, sisanya tetap dikembalikan", async () => {
    getNdviSeries.mockRejectedValue(new Error("ORNL timeout"))
    const result = (await executeTool("get_location_briefing", { ...CENTER, category: "pertanian" })) as Record<string, any>

    expect(result.ndvi).toBeNull()
    expect(result.unavailable).toEqual(["NDVI"])
    expect(result.category).toBe("pertanian")
    expect(result.fire).not.toBeNull()
    expect(result.recommendations.length).toBeGreaterThan(0)
  })

  it("semua sumber gagal -> galat yang jelas", async () => {
    for (const source of [getHotspotDataset, getWeather, getNdviSeries, analyzeLandCover]) source.mockRejectedValue(new Error("down"))
    await expect(executeTool("get_location_briefing", CENTER)).rejects.toThrow(/semua sumber data/)
  })

  it("koordinat di luar Indonesia ditolak sebelum memanggil sumber", async () => {
    await expect(executeTool("get_location_briefing", { lat: 48.85, lng: 2.35 })).rejects.toThrow(/Input tidak valid/)
    expect(getWeather).not.toHaveBeenCalled()
  })
})
