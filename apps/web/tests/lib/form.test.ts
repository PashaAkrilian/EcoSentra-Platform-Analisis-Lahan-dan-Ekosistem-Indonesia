import { describe, expect, it } from "vitest"
import { parseCoordinate, sameLatLng } from "@/lib/form"

describe("parseCoordinate", () => {
  it("menerima titik atau koma desimal dan menolak teks bukan angka", () => {
    expect(parseCoordinate("-6.2088")).toBe(-6.2088)
    expect(parseCoordinate("107,6766")).toBe(107.6766)
    expect(parseCoordinate("  12 ")).toBe(12)
    expect(parseCoordinate("")).toBeNull()
    expect(parseCoordinate("abc")).toBeNull()
  })

  it("ketikan setengah jadi ('107.') terbaca 107 — itu sebabnya teks input tidak boleh ditimpa ulang dari nilai terurai", () => {
    expect(parseCoordinate("107.")).toBe(107)
    expect(String(parseCoordinate("107."))).toBe("107") // normalisasi yang dulu menghapus titik desimal di tengah ketikan
  })
})

describe("sameLatLng", () => {
  it("membandingkan isi, bukan referensi; null sama dengan null saja", () => {
    expect(sameLatLng({ lat: 1, lng: 2 }, { lat: 1, lng: 2 })).toBe(true)
    expect(sameLatLng({ lat: 1, lng: 2 }, { lat: 1, lng: 3 })).toBe(false)
    expect(sameLatLng(null, null)).toBe(true)
    expect(sameLatLng(null, { lat: 0, lng: 0 })).toBe(false)
    expect(sameLatLng({ lat: 0, lng: 0 }, null)).toBe(false)
  })
})
