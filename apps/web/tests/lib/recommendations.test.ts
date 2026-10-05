import { describe, expect, it } from "vitest"
import type { LandCoverResult, NdviResponse, WeatherResponse } from "@/lib/data/types"
import type { NearbyHotspots } from "@/lib/geo"
import { recommend } from "@/lib/recommendations"

const nearby = (within: Record<number, number>, nearestKm: number | null = null): NearbyHotspots => ({ nearestKm, within, nearest: [] })

const weather = (rain: number[], soil: number | null, maxC = 31): WeatherResponse =>
  ({
    source: { name: "Open-Meteo", url: "", fetchedAt: "" },
    lat: 0,
    lng: 0,
    timezone: "Asia/Jakarta",
    current: { time: "", temperatureC: 30, humidityPct: 70, precipitationMm: 0, windSpeedKmh: 5, weatherCode: 0, description: "Cerah", soilMoisture: soil },
    daily: rain.map((mm, i) => ({ date: `2026-10-0${i + 1}`, tempMaxC: maxC, tempMinC: 23, precipitationMm: mm, weatherCode: 0, description: "Cerah" })),
  }) satisfies WeatherResponse

const ndvi = (values: number[]): NdviResponse => ({
  source: { name: "x", url: "", fetchedAt: "", product: "x", resolutionM: 250 },
  lat: 0,
  lng: 0,
  observations: values.map((v, i) => ({ date: `2026-0${i + 1}-01`, ndvi: v, quality: "baik" as const })),
  latest: { date: "2026-08-01", ndvi: values.at(-1)!, quality: "baik" },
})

const landcover = (classes: [number, number][]): LandCoverResult => ({
  source: { name: "x", url: "", fetchedAt: "", dataset: "x", year: 2025, resolutionM: 10 },
  lat: 0,
  lng: 0,
  bufferMeters: 1000,
  areaHa: 314,
  dominantClass: "Pepohonan",
  classes: classes.map(([code, percentage]) => ({ code, name: `kelas${code}`, color: "#000", percentage })),
})

const empty = { landcover: null, ndvi: null, weather: null, nearby: null }

describe("recommend", () => {
  it("titik api dalam 5 km -> tindakan, urut paling atas", () => {
    const result = recommend({ ...empty, category: "kebencanaan", nearby: nearby({ 5: 2, 10: 3, 25: 8 }, 1.4), weather: weather([0, 0, 0], 0.1) })
    expect(result[0]).toMatchObject({ level: "tindakan", title: "Titik api sangat dekat" })
    expect(result[0]!.detail).toContain("2 titik api dalam 5 km")
    expect(result.map((r) => r.level)).toEqual([...result.map((r) => r.level)].sort((a, b) => ["tindakan", "perhatian", "info"].indexOf(a) - ["tindakan", "perhatian", "info"].indexOf(b)))
  })

  it("banyak titik api di 25 km -> perhatian; sedikit -> info", () => {
    expect(recommend({ ...empty, category: "pertanian", nearby: nearby({ 5: 0, 10: 1, 25: 6 }, 7) })[0]).toMatchObject({ level: "perhatian" })
    expect(recommend({ ...empty, category: "pertanian", nearby: nearby({ 5: 0, 10: 0, 25: 0 }) })[0]).toMatchObject({ level: "info", title: "Tidak ada titik api dekat" })
  })

  it("kering & minim hujan: saran irigasi untuk pertanian, risiko kebakaran untuk kategori lain", () => {
    const dry = weather([0.5, 0, 1], 0.12)
    expect(recommend({ ...empty, category: "pertanian", weather: dry })[0]!.detail).toMatch(/irigasi/)
    expect(recommend({ ...empty, category: "kehutanan", weather: dry })[0]!.detail).toMatch(/risiko kebakaran/)
    expect(recommend({ ...empty, category: "pertanian", weather: weather([0, 0, 0], null) })).toEqual([]) // tanpa data tanah tidak menebak
  })

  it("hujan lebat 3 hari -> perhatian banjir/longsor; suhu tinggi -> info", () => {
    const result = recommend({ ...empty, category: "kebencanaan", weather: weather([30, 25, 20], 0.4, 37) })
    expect(result.map((r) => r.title)).toEqual(["Hujan lebat diperkirakan", "Suhu tinggi"])
  })

  it("NDVI turun ≥ 0,1 -> perhatian dengan saran sesuai kategori", () => {
    expect(recommend({ ...empty, category: "pertanian", ndvi: ndvi([0.7, 0.55]) })[0]!.detail).toMatch(/hama/)
    expect(recommend({ ...empty, category: "konservasi", ndvi: ndvi([0.8, 0.6]) })[0]!.detail).toMatch(/pembukaan lahan/)
    expect(recommend({ ...empty, category: "pertanian", ndvi: ndvi([0.7, 0.68]) })).toEqual([])
  })

  it("tutupan lahan: tekanan terbangun untuk konservasi, pertanian rendah di lokasi pertanian", () => {
    const urban = landcover([[7, 45], [2, 40], [5, 15]])
    expect(recommend({ ...empty, category: "konservasi", landcover: urban }).map((r) => r.title)).toEqual(["Tekanan area terbangun tinggi", "Tutupan pohon"])
    expect(recommend({ ...empty, category: "pertanian", landcover: urban })[0]).toMatchObject({ title: "Tutupan pertanian rendah di lokasi" })
  })

  it("tanpa data apa pun -> daftar kosong", () => {
    expect(recommend({ ...empty, category: "pertanian" })).toEqual([])
  })
})
