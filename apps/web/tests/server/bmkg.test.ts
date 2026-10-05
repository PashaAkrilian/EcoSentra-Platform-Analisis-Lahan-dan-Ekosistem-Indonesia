import { readFileSync } from "node:fs"
import { afterEach, describe, expect, it, vi } from "vitest"
import { clearCache } from "@/server/cache"
import { getEarthquakes, hasTsunamiPotential, normalizeQuake, parseBmkgFeed } from "@/server/sources/bmkg"

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../fixtures/bmkg-${name}.json`, import.meta.url), "utf8"))

describe("parseBmkgFeed", () => {
  it("mem-parse feed gempaterkini (list) dengan potensi tsunami", () => {
    const quakes = parseBmkgFeed(fixture("gempaterkini"))
    expect(quakes).toHaveLength(3)
    expect(quakes[0]).toMatchObject({
      occurredAt: "2026-10-03T23:37:31.000Z",
      lat: 4.56,
      lng: 94.97,
      magnitude: 5.9,
      depthKm: 26,
      region: "68 km BaratDaya CALANG-ACEHJAYA",
      potential: "Tidak berpotensi tsunami",
      tsunamiPotential: false,
      felt: null,
    })
  })

  it("mem-parse autogempa (objek tunggal) termasuk shakemap", () => {
    const [quake] = parseBmkgFeed(fixture("autogempa"))
    expect(quake?.felt).toBe("II-III Sikka")
    expect(quake?.shakemapUrl).toBe("https://data.bmkg.go.id/DataMKG/TEWS/20261005194617.mmi.jpg")
  })

  it("mengabaikan record rusak dan payload tak dikenal", () => {
    expect(parseBmkgFeed({ Infogempa: { gempa: [{ Coordinates: "abc" }] } })).toEqual([])
    expect(parseBmkgFeed(null)).toEqual([])
    expect(normalizeQuake({ Coordinates: "1,2", Magnitude: "5", DateTime: "bukan tanggal" })).toBeNull()
  })
})

describe("hasTsunamiPotential", () => {
  it("membedakan teks potensi tsunami BMKG", () => {
    expect(hasTsunamiPotential("Tidak berpotensi tsunami")).toBe(false)
    expect(hasTsunamiPotential("Berpotensi tsunami")).toBe(true)
    expect(hasTsunamiPotential("Gempa ini dirasakan untuk diteruskan pada masyarakat")).toBe(false)
    expect(hasTsunamiPotential(undefined)).toBe(false)
  })
})

describe("getEarthquakes", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    clearCache()
  })

  it("menggabungkan tiga feed BMKG", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const name = url.match(/TEWS\/(\w+)\.json/)![1]!
        return new Response(JSON.stringify(fixture(name)))
      }),
    )

    const result = await getEarthquakes()
    expect(result.source.name).toBe("BMKG")
    expect(result.latest?.magnitude).toBe(3.1)
    expect(result.recent).toHaveLength(3)
    expect(result.felt).toHaveLength(3)
  })
})
