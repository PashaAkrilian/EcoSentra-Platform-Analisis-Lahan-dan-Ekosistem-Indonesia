import { readFileSync } from "node:fs"
import { afterEach, describe, expect, it, vi } from "vitest"
import { clearCache } from "@/server/cache"
import { findProvince } from "@/server/geo/indonesia"
import { getHotspotDataset, parseFirmsCsv, summarizeHotspots, toWibDate } from "@/server/sources/firms"

const sampleCsv = readFileSync(new URL("../fixtures/firms-sample.csv", import.meta.url), "utf8")

describe("findProvince", () => {
  it("mengenali kota-kota besar di provinsi yang benar", () => {
    expect(findProvince(-6.2088, 106.8456)?.name).toBe("DKI Jakarta")
    expect(findProvince(-2.208, 113.9178)?.name).toBe("Kalimantan Tengah")
    expect(findProvince(3.5952, 98.6722)?.name).toBe("Sumatera Utara")
    expect(findProvince(-8.65, 115.2167)?.island).toBe("Bali & Nusa Tenggara")
    expect(findProvince(-4.0975, 138.9508)?.island).toBe("Papua") // Wamena
  })

  it("mengembalikan null untuk laut dan negara tetangga", () => {
    expect(findProvince(-5, 110)).toBeNull() // Laut Jawa
    expect(findProvince(1.5535, 110.3593)).toBeNull() // Kuching, Malaysia
    expect(findProvince(-8.5569, 125.5603)).toBeNull() // Dili, Timor-Leste
    expect(findProvince(-9.4438, 147.1803)).toBeNull() // Port Moresby, PNG
  })
})

describe("parseFirmsCsv", () => {
  const hotspots = parseFirmsCsv(sampleCsv)

  it("hanya menyimpan titik di daratan Indonesia", () => {
    // 10 baris data: 5 di Indonesia, sisanya laut/PNG/Malaysia/Filipina/Timor-Leste + 1 baris rusak
    expect(hotspots).toHaveLength(5)
    expect(new Set(hotspots.map((h) => h.provinceName))).toEqual(
      new Set(["Papua", "Kalimantan Selatan", "Sumatera Selatan"]),
    )
  })

  it("memetakan kolom FIRMS ke bentuk FireHotspot", () => {
    const papua = hotspots.find((h) => h.lat === -9.0224)
    expect(papua).toEqual({
      lat: -9.0224,
      lng: 140.97627,
      brightnessK: 336.4,
      frpMw: 6.63,
      confidence: "low",
      acquiredAt: "2026-10-04T04:02:00.000Z",
      daynight: "D",
      provinceIso: "ID-PA",
      provinceName: "Papua",
      island: "Papua",
    })
  })

  it("mengurutkan dari deteksi terbaru", () => {
    const times = hotspots.map((h) => h.acquiredAt)
    expect([...times].sort().reverse()).toEqual(times)
  })

  it("menolak CSV tanpa kolom wajib", () => {
    expect(() => parseFirmsCsv("foo,bar\n1,2")).toThrow(/tidak dikenali/)
  })
})

describe("summarizeHotspots", () => {
  it("menghitung total, per provinsi, per pulau, dan per hari WIB", () => {
    const summary = summarizeHotspots({
      range: "24h",
      url: "https://example.test/firms.csv",
      satellite: "Suomi NPP VIIRS 375 m",
      fetchedAt: "2026-10-05T00:00:00.000Z",
      hotspots: parseFirmsCsv(sampleCsv),
    })

    expect(summary.total).toBe(5)
    expect(summary.highConfidence).toBe(1)
    expect(summary.latestAcquiredAt).toBe("2026-10-04T05:46:00.000Z")
    expect(summary.byProvince.map((p) => [p.name, p.count])).toEqual([
      ["Papua", 2],
      ["Sumatera Selatan", 2],
      ["Kalimantan Selatan", 1],
    ])
    expect(summary.byIsland.find((i) => i.island === "Sumatera")?.count).toBe(2)
    expect(summary.byIsland.find((i) => i.island === "Jawa")?.count).toBe(0)
    // 2026-10-03 18:30 UTC = 2026-10-04 01:30 WIB -> semua jatuh di 4 Oktober WIB
    expect(summary.byDay).toEqual([{ date: "2026-10-04", count: 5 }])
  })
})

describe("toWibDate", () => {
  it("menggeser tanggal UTC ke WIB", () => {
    expect(toWibDate("2026-10-03T16:59:00.000Z")).toBe("2026-10-03")
    expect(toWibDate("2026-10-03T17:00:00.000Z")).toBe("2026-10-04")
  })
})

describe("getHotspotDataset", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    clearCache()
  })

  it("mengambil CSV sekali lalu memakai cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(sampleCsv))
    vi.stubGlobal("fetch", fetchMock)

    const first = await getHotspotDataset("24h")
    const second = await getHotspotDataset("24h")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]![0]).toContain("SUOMI_VIIRS_C2_SouthEast_Asia_24h.csv")
    expect(first.hotspots).toHaveLength(5)
    expect(second).toBe(first)
  })

  it("melempar error jelas kalau FIRMS gagal dan belum ada cache", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })))
    await expect(getHotspotDataset("7d")).rejects.toThrow(/status 503/)
  })
})

describe("data provinsi", () => {
  it("luas 34 provinsi menjumlah ≈ luas daratan Indonesia", async () => {
    const { listProvinces } = await import("@/server/geo/indonesia")
    const provinces = listProvinces()
    expect(provinces).toHaveLength(34)
    const total = provinces.reduce((sum, p) => sum + p.areaKm2, 0)
    // resmi ±1.904.569 km² (BPS); data sederhana boleh meleset < 1%
    expect(total).toBeGreaterThan(1_880_000)
    expect(total).toBeLessThan(1_930_000)
    expect(provinces.find((p) => p.iso === "ID-JK")!.areaKm2).toBeLessThan(800)
  })

  it("GeoJSON provinsi valid & lengkap", async () => {
    const { provincesGeoJson } = await import("@/server/geo/indonesia")
    const geojson = provincesGeoJson()
    expect(geojson.features).toHaveLength(34)
    const kalteng = geojson.features.find((f) => f.properties.iso === "ID-KT")!
    expect(kalteng.properties.name).toBe("Kalimantan Tengah")
    const ring = kalteng.geometry.coordinates[0]![0]!
    expect(ring[0]).toEqual(ring.at(-1)) // ring tertutup
    expect(ring[0]).toHaveLength(2)
  })
})
