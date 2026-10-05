import { describe, expect, it } from "vitest"
import { findProvinceInText, resolveProvince } from "@/lib/province-search"

describe("resolveProvince", () => {
  it("mengenali nama resmi, kode ISO, dan singkatan umum", () => {
    expect(resolveProvince("Kalimantan Tengah")?.iso).toBe("ID-KT")
    expect(resolveProvince("ID-KT")?.iso).toBe("ID-KT")
    expect(resolveProvince("kalteng")?.iso).toBe("ID-KT")
    expect(resolveProvince("Provinsi Jawa Barat")?.iso).toBe("ID-JB")
    expect(resolveProvince("DKI Jakarta")?.iso).toBe("ID-JK")
    expect(resolveProvince("Sumatra Selatan")?.iso).toBe("ID-SS")
    expect(resolveProvince("Jogja")?.iso).toBe("ID-YO")
  })

  it("menolak teks yang bukan provinsi", () => {
    expect(resolveProvince("Kalimantan")).toBeNull() // ambigu
    expect(resolveProvince("Bandung")).toBeNull()
    expect(resolveProvince("")).toBeNull()
  })
})

describe("findProvinceInText", () => {
  it("menemukan provinsi di dalam kalimat", () => {
    expect(findProvinceInText("Berapa titik api di Kalimantan Tengah hari ini?")?.iso).toBe("ID-KT")
    expect(findProvinceInText("kondisi karhutla di riau gimana")?.iso).toBe("ID-RI")
    expect(findProvinceInText("titik api di sumsel dan jambi")?.name).toMatch(/Sumatera Selatan|Jambi/)
  })

  it("pencocokan terpanjang menang: Papua Barat bukan Papua, Kepulauan Riau bukan Riau", () => {
    expect(findProvinceInText("gempa di Papua Barat")?.iso).toBe("ID-PB")
    expect(findProvinceInText("cuaca Kepulauan Riau")?.iso).toBe("ID-KR")
    expect(findProvinceInText("titik api Papua")?.iso).toBe("ID-PA")
  })

  it("tidak salah cocok pada potongan kata", () => {
    expect(findProvinceInText("Saya ingin membuat laporan")).toBeNull()
    expect(findProvinceInText("apa itu NDVI?")).toBeNull()
  })
})
