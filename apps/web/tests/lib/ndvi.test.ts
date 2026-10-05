import { describe, expect, it } from "vitest"
import { describeNdvi, ndviTrend } from "@/lib/ndvi"

describe("describeNdvi", () => {
  it("memetakan nilai ke kelas vegetasi", () => {
    expect(describeNdvi(0.05).level).toBe("none")
    expect(describeNdvi(0.2).level).toBe("sparse")
    expect(describeNdvi(0.45).level).toBe("moderate")
    expect(describeNdvi(0.6).level).toBe("dense")
    expect(describeNdvi(0.82).level).toBe("very-dense")
  })
})

describe("ndviTrend", () => {
  it("butuh minimal dua observasi", () => {
    expect(ndviTrend([0.5])).toBeNull()
  })
  it("menilai naik/turun/stabil dengan ambang 0,03", () => {
    expect(ndviTrend([0.4, 0.5])).toEqual({ delta: 0.1, direction: "naik" })
    expect(ndviTrend([0.6, 0.45])).toEqual({ delta: -0.15, direction: "turun" })
    expect(ndviTrend([0.5, 0.52])).toEqual({ delta: 0.02, direction: "stabil" })
  })
})
