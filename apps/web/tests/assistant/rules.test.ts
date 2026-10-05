import { beforeEach, describe, expect, it, vi } from "vitest"

const executeTool = vi.fn()
vi.mock("@/server/assistant/tools", () => ({
  executeTool: (...args: unknown[]) => executeTool(...args),
}))

const { answerWithRules, extractCoordinates } = await import("@/server/assistant/rules")

beforeEach(() => {
  executeTool.mockReset()
})

const fireResult = {
  scope: "Kalimantan Tengah",
  range: "24h",
  total: 3079,
  highConfidence: 231,
  latestDetection: "5 Okt 2026, 14.09 WIB",
  areaKm2: 154189,
  densityPer1000Km2: 20,
  dailyCountsWib: [],
  source: "NASA FIRMS",
  fetchedAt: "5 Okt 2026, 21.22 WIB",
}

describe("extractCoordinates", () => {
  it("membaca 'lat, lng' dengan koma/titik desimal & menolak di luar Indonesia", () => {
    expect(extractCoordinates("cuaca di -6.57, 107.76 gimana?")).toEqual({ lat: -6.57, lng: 107.76 })
    expect(extractCoordinates("koordinat -6,57 107,76")).toEqual({ lat: -6.57, lng: 107.76 })
    expect(extractCoordinates("kota 48.85, 2.35")).toBeNull()
    expect(extractCoordinates("tidak ada koordinat")).toBeNull()
  })
})

describe("answerWithRules", () => {
  it("titik api per provinsi memanggil get_fire_hotspots dan memakai angka dari alat", async () => {
    executeTool.mockResolvedValue(fireResult)
    const answer = await answerWithRules("Berapa titik api di Kalteng hari ini?")

    expect(executeTool).toHaveBeenCalledWith("get_fire_hotspots", { province: "Kalimantan Tengah", range: "24h" })
    expect(answer.tools).toEqual(["get_fire_hotspots"])
    expect(answer.text).toContain("**3.079** titik")
    expect(answer.text).toContain("231")
    expect(answer.text).toContain("20 titik per 1.000 km²")
    expect(answer.text).toMatch(/bukan kebakaran terverifikasi/)
  })

  it("mengenali rentang waktu dan pertanyaan nasional", async () => {
    executeTool.mockResolvedValue({
      ...fireResult,
      scope: "Seluruh Indonesia",
      range: "7d",
      densityPer1000Km2: undefined,
      topProvinces: [{ name: "Kalimantan Tengah", count: 11770 }, { name: "Papua", count: 9339 }],
      dailyCountsWib: [{ date: "2026-09-28", count: 4049, partialDay: true }, { date: "2026-09-29", count: 6823 }],
    })
    const answer = await answerWithRules("provinsi mana titik api paling banyak 7 hari terakhir")
    expect(executeTool).toHaveBeenCalledWith("get_fire_hotspots", { province: undefined, range: "7d" })
    expect(answer.text).toContain("Kalimantan Tengah (11.770)")
    expect(answer.text).toContain("09-28: 4.049*")
  })

  it("gempa: menampilkan potensi tsunami & rujukan lembaga resmi", async () => {
    executeTool.mockResolvedValue({
      kind: "m5",
      events: [{ magnitude: 6.1, region: "14 km BaratDaya KODI", timeWib: "4 Okt 2026, 05.55 WIB", depthKm: 10, tsunamiPotential: true, feltMmi: null }],
      source: "BMKG",
      fetchedAt: "x",
    })
    const answer = await answerWithRules("ada gempa apa hari ini")
    expect(answer.text).toContain("M 6.1")
    expect(answer.text).toContain("BERPOTENSI TSUNAMI")
    expect(answer.text).toMatch(/BMKG\/BNPB/)
  })

  it("cuaca tanpa lokasi meminta lokasi; dengan konteks peta memanggil get_weather", async () => {
    const without = await answerWithRules("bagaimana cuaca?")
    expect(without.text).toMatch(/perlu lokasi/)
    expect(executeTool).not.toHaveBeenCalled()

    executeTool.mockResolvedValue({
      location: { lat: -6.57, lng: 107.76 },
      nowWib: "5 Okt 2026, 20.15 WIB",
      current: { description: "Berawan sebagian", temperatureC: 30.2, humidityPct: 64, precipitationMm: 0, windKmh: 7.9, soilMoistureVolumetricPct: 16.2 },
      forecast: [{ date: "2026-10-05", description: "Gerimis ringan", minC: 24, maxC: 37, rainMm: 0.1 }],
      source: "Open-Meteo",
    })
    const withContext = await answerWithRules("bagaimana cuaca di sini?", { location: { lat: -6.57, lng: 107.76 } })
    expect(executeTool).toHaveBeenCalledWith("get_weather", { lat: -6.57, lng: 107.76 })
    expect(withContext.text).toContain("30°C")
    expect(withContext.text).toContain("Kelembapan tanah (model): 16.2%")
  })

  it("NDVI: menafsirkan nilai & menandai observasi berawan", async () => {
    executeTool.mockResolvedValue({
      location: { lat: -6.57, lng: 107.76 },
      latestReliable: { date: "2026-08-13", ndvi: 0.85, quality: "baik" },
      recentObservations: [
        { ndvi: 0.8, quality: "baik" },
        { ndvi: 0.85, quality: "baik" },
        { ndvi: 0.5, quality: "berawan" },
      ],
      cloudyObservations: 5,
      totalObservations: 18,
      source: "NASA MODIS",
    })
    const answer = await answerWithRules("kondisi vegetasi di -6.57, 107.76")
    expect(answer.text).toContain("**0.85**")
    expect(answer.text).toMatch(/sangat lebat/)
    expect(answer.text).toContain("5 dari 18 observasi berawan")
  })

  it("tutupan lahan provinsi memakai get_province_land_cover", async () => {
    executeTool.mockResolvedValue({
      province: "Riau",
      areaKm2: 89921,
      classes: [{ name: "Pepohonan", percentage: 61.2 }, { name: "Tanaman pertanian", percentage: 20 }],
      dataset: "Sentinel-2 10m 2025",
      source: "Esri",
      note: "catatan",
    })
    const answer = await answerWithRules("bagaimana tutupan lahan Riau?")
    expect(executeTool).toHaveBeenCalledWith("get_province_land_cover", { province: "Riau" })
    expect(answer.text).toContain("Pepohonan 61,2%")
  })

  it("istilah umum dijawab dari glosarium tanpa memanggil alat", async () => {
    const ndvi = await answerWithRules("apa itu NDVI?")
    expect(ndvi.tools).toEqual([])
    expect(ndvi.text).toMatch(/Normalized Difference Vegetation Index/)
    expect(executeTool).not.toHaveBeenCalled()
  })

  it("galat sumber data dijelaskan, bukan melempar", async () => {
    executeTool.mockRejectedValue(new Error("NASA FIRMS mengembalikan status 503"))
    const answer = await answerWithRules("titik api hari ini")
    expect(answer.text).toMatch(/belum bisa diambil.*503/)
  })

  it("pertanyaan tak dikenal -> contoh pertanyaan & penjelasan mode", async () => {
    const answer = await answerWithRules("resep nasi goreng")
    expect(answer.text).toMatch(/mode berbasis aturan/)
    expect(answer.text).toContain("Berapa titik api di Kalimantan Tengah hari ini?")
    expect(answer.tools).toEqual([])
  })
})
