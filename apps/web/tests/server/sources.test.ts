import { readFileSync } from "node:fs"
import { afterEach, describe, expect, it, vi } from "vitest"
import { clearCache } from "@/server/cache"
import { analyzeLandCover, circlePolygon } from "@/server/sources/landcover"
import { getNdviSeries, mergeNdviBands, toModisDate } from "@/server/sources/modisNdvi"
import { describeWeatherCode, getWeather, parseOpenMeteo } from "@/server/sources/openMeteo"

const fixture = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8")

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  clearCache()
})

describe("Open-Meteo", () => {
  it("mem-parse kondisi terkini & prakiraan harian", () => {
    const parsed = parseOpenMeteo(JSON.parse(fixture("open-meteo.json")), -6.57, 107.76)
    expect(parsed.timezone).toBe("Asia/Jakarta")
    // "2026-10-05T20:15" WIB = 13:15 UTC
    expect(parsed.current.time).toBe("2026-10-05T13:15:00.000Z")
    expect(parsed.current.description).toBe(describeWeatherCode(parsed.current.weatherCode))
    expect(parsed.current.soilMoisture).toBeGreaterThan(0)
    expect(parsed.daily).toHaveLength(3)
    expect(parsed.daily[0]).toMatchObject({ date: "2026-10-05" })
  })

  it("menerjemahkan kode cuaca WMO ke Bahasa Indonesia", () => {
    expect(describeWeatherCode(0)).toBe("Cerah")
    expect(describeWeatherCode(95)).toBe("Badai petir")
    expect(describeWeatherCode(12345)).toBe("Tidak diketahui")
  })

  it("membulatkan koordinat supaya klik berdekatan berbagi cache", async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response(fixture("open-meteo.json")))
    vi.stubGlobal("fetch", fetchMock)
    await getWeather(-6.5712, 107.7611)
    await getWeather(-6.5699, 107.7589)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]![0])).toContain("latitude=-6.57&longitude=107.76")
  })
})

describe("NDVI MODIS (ORNL)", () => {
  it("mengubah tanggal ke format hari-dalam-tahun MODIS", () => {
    expect(toModisDate(new Date("2026-01-01T00:00:00Z"))).toBe("A2026001")
    expect(toModisDate(new Date("2026-10-05T12:00:00Z"))).toBe("A2026278")
  })

  it("menggabungkan band NDVI & reliability, menandai observasi berawan", () => {
    const observations = mergeNdviBands(
      new Map([
        ["2026-04-23", 5090],
        ["2026-05-09", 4005],
        ["2026-05-25", -3000], // fill value -> dibuang
      ]),
      new Map([
        ["2026-04-23", 3],
        ["2026-05-09", 0],
      ]),
    )
    expect(observations).toEqual([
      { date: "2026-04-23", ndvi: 0.509, quality: "berawan" },
      { date: "2026-05-09", ndvi: 0.401, quality: "baik" },
    ])
  })

  it("mengambil dua jendela waktu dan memilih observasi terbaru yang tidak berawan", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const band = new URL(url).searchParams.get("band")
      if (new URL(url).searchParams.get("endDate") !== "A2026278") return new Response(JSON.stringify({ subset: [] }))
      return new Response(fixture(band === "250m_16_days_NDVI" ? "ornl-ndvi.json" : "ornl-reliability.json"))
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await getNdviSeries(-6.5704, 107.7601, new Date("2026-10-05T00:00:00Z"))

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(result.lat).toBe(-6.57)
    expect(result.observations).toHaveLength(8)
    expect(result.observations[0]).toMatchObject({ date: "2026-04-23", quality: "berawan" })
    expect(result.latest).toEqual({ date: "2026-08-13", ndvi: 0.425, quality: "marginal" })
  })
})

describe("Tutupan lahan", () => {
  it("membuat poligon lingkaran tertutup dengan radius yang benar", () => {
    const ring = circlePolygon(0, 110, 1000)
    expect(ring[0]).toEqual(ring.at(-1))
    // titik utara: +1000 m ≈ +0.00898°
    expect(ring[0]![1]).toBeCloseTo(0.00898, 4)
  })

  it("memakai Esri Land Cover kalau GEO_SERVICE_URL tidak di-set", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("computeHistograms")) {
        const params = new URL(url).searchParams
        expect(params.get("time")).toBe(`${Date.UTC(2025, 0, 1)},${Date.UTC(2025, 11, 31, 23, 59, 59)}`)
        // radius 20 km -> diameter 40 km / 3000 px = 14 m per piksel
        expect(JSON.parse(params.get("pixelSize")!).x).toBe(14)
        return Response.json({ histograms: [{ size: 12, min: -0.5, max: 11.5, counts: [5, 0, 600, 0, 0, 100, 0, 300, 0, 0, 0, 0] }] })
      }
      return new Response(fixture("esri-lulc-info.json"))
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await analyzeLandCover(-2.2, 113.9, 20_000)

    expect(result.source.dataset).toBe("Sentinel-2 10m Land Use/Land Cover")
    expect(result.source.year).toBe(2025)
    expect(result.dominantClass).toBe("Pepohonan")
    // nilai 0 (no data) tidak dihitung
    expect(result.classes.map((c) => [c.code, c.percentage])).toEqual([
      [2, 60],
      [7, 30],
      [5, 10],
    ])
    expect(result.areaHa).toBe(125_664)
  })

  it("memakai services/geo kalau dikonfigurasi, dan jatuh ke Esri kalau gagal", async () => {
    vi.stubEnv("GEO_SERVICE_URL", "http://geo.test/")
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://geo.test/api/landcover") {
        return Response.json({
          dominant_class: "Tree cover",
          classes: [
            { name: "Tree cover", code: 10, percentage: 80 },
            { name: "Mangroves", code: 95, percentage: 20 },
          ],
        })
      }
      throw new Error(`unexpected ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    const fromGeo = await analyzeLandCover(-1, 117, 1000)
    expect(fromGeo.source.dataset).toBe("ESA WorldCover v200")
    expect(fromGeo.classes.map((c) => c.name)).toEqual(["Tutupan pohon", "Mangrove"])

    // API key services/geo dikirim sebagai header X-API-Key kalau dikonfigurasi
    clearCache()
    vi.stubEnv("GEO_SERVICE_API_KEY", "kunci-rahasia")
    const withKey = vi.fn(async (_url: string, _init?: RequestInit) =>
      Response.json({ classes: [{ code: 10, percentage: 100 }] }),
    )
    vi.stubGlobal("fetch", withKey)
    await analyzeLandCover(-1, 117.5, 1000)
    expect(new Headers(withKey.mock.calls[0]![1]!.headers).get("x-api-key")).toBe("kunci-rahasia")
    vi.unstubAllEnvs()
    vi.stubEnv("GEO_SERVICE_URL", "http://geo.test/")

    clearCache()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("http://geo.test")) return new Response("boom", { status: 502 })
        if (url.includes("computeHistograms")) return Response.json({ histograms: [{ min: -0.5, counts: [0, 1] }] })
        return new Response(fixture("esri-lulc-info.json"))
      }),
    )
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const fallback = await analyzeLandCover(-1, 117, 1000)
    expect(fallback.source.dataset).toBe("Sentinel-2 10m Land Use/Land Cover")
    expect(fallback.dominantClass).toBe("Badan air")
    expect(warn).toHaveBeenCalled()
  })
})
