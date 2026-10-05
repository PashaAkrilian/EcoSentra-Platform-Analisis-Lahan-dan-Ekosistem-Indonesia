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

const nearbyFire = {
  center: { lat: -2.2136, lng: 113.9108 },
  range: "24h",
  withinKm: { "5": 3, "10": 8, "25": 21 },
  nearestKm: 3.7,
  nearest: [{ km: 3.7, confidence: "tinggi", frpMw: 4.1, detectedAt: "5 Okt 2026, 14.09 WIB" }],
  source: "NASA FIRMS",
  fetchedAt: "6 Okt 2026, 02.38 WIB",
}

const briefing = {
  location: { lat: -2.2136, lng: 113.9108 },
  category: "kebencanaan",
  fire: nearbyFire,
  weather: {
    location: { lat: -2.2136, lng: 113.9108 },
    nowWib: "6 Okt 2026, 09.00 WIB",
    current: { description: "Cerah", temperatureC: 31, humidityPct: 70, precipitationMm: 0, windKmh: 6, soilMoistureVolumetricPct: 12 },
    forecast: [{ date: "2026-10-06", description: "Cerah", minC: 24, maxC: 34, rainMm: 0.1 }],
    source: "Open-Meteo",
  },
  ndvi: null,
  landCover: { bufferMeters: 1000, areaHa: 314, classes: [{ name: "Area terbangun", percentage: 100 }], dataset: "Sentinel-2 10m LULC 2025", source: "Esri", note: "Klasifikasi otomatis." },
  recommendations: [
    { level: "tindakan", title: "Titik api sangat dekat", detail: "3 titik api dalam 5 km (terdekat 3.7 km)." },
    { level: "perhatian", title: "Kering dan minim hujan", detail: "Prakiraan hujan 3 hari hanya 0.4 mm." },
  ],
  unavailable: ["NDVI"],
  note: "Rekomendasi indikatif.",
}

describe("pertanyaan tentang satu lokasi", () => {
  const scenarioQuestion =
    'Saya punya skenario "Pencegahan karhutla musim kemarau" (kategori kebencanaan, prioritas sedang) di koordinat -2.21360, 113.91080. ' +
    "Berdasarkan data terkini di lokasi itu, apa risikonya dan langkah apa yang Anda sarankan?"

  it("minta risiko/langkah dengan koordinat -> ringkasan lokasi, bukan statistik nasional (walau ada kata 'karhutla')", async () => {
    executeTool.mockResolvedValue(briefing)
    const answer = await answerWithRules(scenarioQuestion)

    expect(executeTool).toHaveBeenCalledTimes(1)
    expect(executeTool).toHaveBeenCalledWith("get_location_briefing", { lat: -2.2136, lng: 113.9108, category: "kebencanaan" })
    expect(answer.tools).toEqual(["get_location_briefing"])
    expect(answer.text).toContain("Ringkasan lokasi -2.214, 113.911")
    expect(answer.text).toContain("Dalam 5 km: **3** · 10 km: **8** · 25 km: **21** titik")
    expect(answer.text).toContain("Terdekat 3.7 km (keyakinan tinggi")
    expect(answer.text).toContain("**Perlu tindakan — Titik api sangat dekat.**")
    expect(answer.text).toContain("Belum tersedia saat ini: NDVI")
    expect(answer.text).not.toMatch(/Seluruh Indonesia/)
  })

  it("kategori dibaca dari kalimat, 'tanaman' tidak dianggap kata 'aman'", async () => {
    executeTool.mockResolvedValue(briefing)
    await answerWithRules("Apa saran untuk sawah padi di -6.57, 107.76?")
    expect(executeTool).toHaveBeenLastCalledWith("get_location_briefing", { lat: -6.57, lng: 107.76, category: "pertanian" })

    executeTool.mockResolvedValue({ ...fireResult, nearby: nearbyFire })
    await answerWithRules("cuaca untuk tanaman padi di -6.57, 107.76")
    expect(executeTool).toHaveBeenLastCalledWith("get_weather", { lat: -6.57, lng: 107.76 })
  })

  it("'bagaimana kondisi di sini?' dengan titik terpilih di peta -> ringkasan lokasi", async () => {
    executeTool.mockResolvedValue(briefing)
    await answerWithRules("Bagaimana kondisi di sini?", { location: { lat: -6.57, lng: 107.76 } })
    expect(executeTool).toHaveBeenCalledWith("get_location_briefing", { lat: -6.57, lng: 107.76, category: "kebencanaan" })
  })

  it("titik api di sekitar koordinat -> get_fire_hotspots dengan lat/lng, hanya jumlah di sekitar titik", async () => {
    executeTool.mockResolvedValue({ ...fireResult, nearby: nearbyFire })
    const answer = await answerWithRules("ada titik api di sekitar -2.2136, 113.9108?")
    expect(executeTool).toHaveBeenCalledWith("get_fire_hotspots", { lat: -2.2136, lng: 113.9108, range: "24h" })
    expect(answer.text).toContain("**Titik api di sekitar -2.214, 113.911 (24 jam terakhir)**")
    expect(answer.text).toContain("Dalam 5 km: **3**")
    expect(answer.text).toMatch(/bukan kebakaran terverifikasi/)
  })

  it("tanpa titik, pertanyaan risiko kebakaran tetap dijawab dengan data nasional", async () => {
    executeTool.mockResolvedValue({ ...fireResult, scope: "Seluruh Indonesia", densityPer1000Km2: undefined, topProvinces: [] })
    await answerWithRules("apa risiko kebakaran lahan sekarang?", { location: { lat: -6.57, lng: 107.76 } })
    expect(executeTool).toHaveBeenCalledWith("get_fire_hotspots", { province: undefined, range: "24h" })
  })

  it("tidak ada titik api dalam 25 km dinyatakan eksplisit", async () => {
    executeTool.mockResolvedValue({ ...fireResult, nearby: { ...nearbyFire, withinKm: { "5": 0, "10": 0, "25": 0 }, nearestKm: null, nearest: [] } })
    const answer = await answerWithRules("titik api di sekitar -2.2136, 113.9108")
    expect(answer.text).toContain("Tidak ada titik api dalam radius 25 km.")
  })
})
