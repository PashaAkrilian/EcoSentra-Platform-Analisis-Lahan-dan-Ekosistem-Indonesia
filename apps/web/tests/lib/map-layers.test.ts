import { describe, expect, it } from "vitest"
import { buildLandCoverTileUrl, fireRadius, quakeRadius, RASTER_OVERLAYS, tileBboxMercator } from "@/lib/map/layers"

describe("tileBboxMercator", () => {
  it("tile 0/0/0 mencakup seluruh dunia", () => {
    const [xmin, ymin, xmax, ymax] = tileBboxMercator(0, 0, 0)
    expect(xmin).toBeCloseTo(-20037508.34, 1)
    expect(xmax).toBeCloseTo(20037508.34, 1)
    expect(ymin).toBeCloseTo(-20037508.34, 1)
    expect(ymax).toBeCloseTo(20037508.34, 1)
  })

  it("tile berdekatan saling menyambung tanpa celah", () => {
    const a = tileBboxMercator(9, 408, 265)
    const right = tileBboxMercator(9, 409, 265)
    const below = tileBboxMercator(9, 408, 266)
    expect(right[0]).toBeCloseTo(a[2], 3)
    expect(below[3]).toBeCloseTo(a[1], 3)
  })

  it("cocok dengan tile Esri yang sudah diverifikasi manual (z9, Jawa Barat)", () => {
    const [xmin, ymin, xmax, ymax] = tileBboxMercator(9, 408, 265)
    // lon 107.0 / lat -6.9 jatuh di dalam tile ini
    const lonToX = (lon: number) => (lon * Math.PI * 6378137) / 180
    const latToY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 6378137
    expect(lonToX(107.0)).toBeGreaterThan(xmin)
    expect(lonToX(107.0)).toBeLessThan(xmax)
    expect(latToY(-6.9)).toBeGreaterThan(ymin)
    expect(latToY(-6.9)).toBeLessThan(ymax)
  })
})

describe("buildLandCoverTileUrl", () => {
  it("membuat URL exportImage dengan rentang waktu tahun yang diminta", () => {
    const url = new URL(buildLandCoverTileUrl(9, 408, 265, 2025))
    expect(url.origin + url.pathname).toBe(
      "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer/exportImage",
    )
    expect(url.searchParams.get("bboxSR")).toBe("3857")
    expect(url.searchParams.get("size")).toBe("256,256")
    expect(url.searchParams.get("time")).toBe(`${Date.UTC(2025, 0, 1)},${Date.UTC(2025, 11, 31, 23, 59, 59)}`)
    expect(url.searchParams.get("bbox")!.split(",")).toHaveLength(4)
  })
})

describe("gaya penanda", () => {
  it("radius titik api & gempa dibatasi dalam rentang wajar", () => {
    expect(fireRadius(0)).toBe(3)
    expect(fireRadius(10)).toBeGreaterThan(fireRadius(2))
    expect(fireRadius(10_000)).toBe(9)
    expect(quakeRadius(5)).toBe(8)
    expect(quakeRadius(7)).toBe(16)
    expect(quakeRadius(9.5)).toBe(22)
  })
})

describe("legenda", () => {
  it("legenda gradien suhu menampilkan derajat Celsius", () => {
    const lst = RASTER_OVERLAYS.find((o) => o.id === "lst")!.legend
    if (lst.kind !== "gradient") throw new Error("harus gradien")
    expect(lst.format(300)).toBe("27")
    expect(lst.stops.map((s) => s.value)).toEqual([...lst.stops.map((s) => s.value)].sort((a, b) => a - b))
  })
})

describe("nearbyHotspots", () => {
  const NOW = 1_790_000_000
  const points = [
    [-2.2, 113.9, 5, 1, NOW, "ID-KT"], // titik pusat
    [-2.21, 113.91, 12, 2, NOW, "ID-KT"], // ±1,6 km
    [-2.3, 113.9, 3, 0, NOW, "ID-KT"], // ±11 km
    [-2.5, 113.9, 3, 1, NOW, "ID-KT"], // ±33 km (di luar radius)
    [-6.2, 106.8, 3, 1, NOW, "ID-JK"], // jauh sekali
  ] as const

  it("menghitung jumlah per radius & titik terdekat berurutan", async () => {
    const { nearbyHotspots } = await import("@/lib/geo")
    const result = nearbyHotspots(points, { lat: -2.2, lng: 113.9 })
    expect(result.within).toEqual({ 5: 2, 10: 2, 25: 3 })
    expect(result.nearestKm).toBeCloseTo(0, 3)
    expect(result.nearest.map((n) => Math.round(n.km))).toEqual([0, 2, 11])
  })

  it("tanpa titik api di sekitar -> nearestKm null", async () => {
    const { nearbyHotspots } = await import("@/lib/geo")
    expect(nearbyHotspots([], { lat: 0, lng: 100 })).toEqual({ nearestKm: null, within: { 5: 0, 10: 0, 25: 0 }, nearest: [] })
  })
})

describe("bufferForArea", () => {
  it("radius lingkaran setara luas lahan, dibatasi 100 m – 50 km", async () => {
    const { bufferForArea } = await import("@/lib/geo")
    expect(bufferForArea(1)).toBe(100) // 1 ha -> r ≈ 56 m -> dinaikkan ke minimum
    expect(bufferForArea(314)).toBe(1000) // 314 ha ≈ lingkaran r = 1 km
    expect(bufferForArea(10_000_000)).toBe(50_000)
  })
})
