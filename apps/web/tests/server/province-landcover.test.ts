import { readFileSync } from "node:fs"
import { afterEach, describe, expect, it, vi } from "vitest"
import { clearCache } from "@/server/cache"
import { esriHistogramToCounts } from "@/server/sources/landcover"
import { getProvinceLandCover, sampleResolutionM, UnknownProvinceError } from "@/server/sources/provinceLandcover"

const info = readFileSync(new URL("../fixtures/esri-lulc-info.json", import.meta.url), "utf8")

afterEach(() => {
  vi.unstubAllGlobals()
  clearCache()
})

describe("sampleResolutionM", () => {
  it("minimal 250 m dan dibulatkan ke atas per 50 m agar muat ≤ 3000 px", () => {
    expect(sampleResolutionM([106.7, -6.4, 107.0, -6.1])).toBe(250) // Jakarta
    // Papua: ±960 km tinggi -> 320 m -> 350 m
    expect(sampleResolutionM([134.0, -9.1, 141.0, -0.3])).toBe(350)
  })
})

describe("esriHistogramToCounts", () => {
  it("memetakan bin ke kode kelas dan membuang no-data (0)", () => {
    const counts = esriHistogramToCounts({ histograms: [{ min: -0.5, counts: [9, 0, 600, 0, 0, 100, 0, 300] }] })
    expect([...counts.entries()]).toEqual([
      [2, 600],
      [5, 100],
      [7, 300],
    ])
  })

  it("melempar error yang jelas untuk respons error Esri", () => {
    expect(() => esriHistogramToCounts({ error: { details: ["The requested image exceeds the size limit."] } })).toThrow(
      /exceeds the size limit/,
    )
    expect(() => esriHistogramToCounts({})).toThrow(/histogram kosong/)
  })
})

describe("getProvinceLandCover", () => {
  it("memanggil computeHistograms (POST) dengan poligon provinsi dan menghitung persentase", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("computeHistograms")) {
        expect(init?.method).toBe("POST")
        const body = new URLSearchParams(String(init?.body))
        const geometry = JSON.parse(body.get("geometry")!)
        expect(geometry.rings.length).toBeGreaterThan(0)
        expect(geometry.rings[0][0]).toHaveLength(2)
        expect(body.get("geometryType")).toBe("esriGeometryPolygon")
        expect(JSON.parse(body.get("pixelSize")!).x).toBeGreaterThanOrEqual(250)
        return Response.json({ histograms: [{ min: -0.5, counts: [0, 0, 870, 0, 0, 42, 0, 10, 0, 0, 0, 78] }] })
      }
      return new Response(info)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await getProvinceLandCover("ID-KT")

    expect(result).toMatchObject({ iso: "ID-KT", name: "Kalimantan Tengah", island: "Kalimantan" })
    expect(result.areaKm2).toBeGreaterThan(150_000)
    expect(result.source.year).toBe(2025)
    expect(result.classes.map((c) => [c.code, c.percentage])).toEqual([
      [2, 87],
      [11, 7.8],
      [5, 4.2],
      [7, 1],
    ])
    // hasil di-cache: panggilan kedua tidak memanggil Esri lagi
    await getProvinceLandCover("ID-KT")
    expect(fetchMock.mock.calls.filter(([u]) => String(u).endsWith("computeHistograms"))).toHaveLength(1)
  })

  it("menolak kode provinsi yang tidak dikenal", async () => {
    await expect(getProvinceLandCover("ID-XX")).rejects.toBeInstanceOf(UnknownProvinceError)
  })
})
