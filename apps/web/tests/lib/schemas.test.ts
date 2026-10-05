import { describe, expect, it } from "vitest"
import type { ZodTypeAny } from "zod"
import { zodFieldErrors } from "@/lib/form"
import { alertInputSchema, fieldInputSchema, profileInputSchema, scenarioInputSchema } from "@/lib/schemas"

function errorsOf(schema: ZodTypeAny, input: unknown): Record<string, string> {
  const result = schema.safeParse(input)
  return result.success ? {} : zodFieldErrors(result.error)
}

describe("pesan galat validasi", () => {
  it("form lahan kosong: pesan Indonesia yang menjelaskan apa yang harus diisi", () => {
    expect(errorsOf(fieldInputSchema, { name: "", cropType: "", areaHa: undefined, location: undefined })).toEqual({
      name: "Nama lahan wajib diisi",
      cropType: "Pilih jenis tanaman dari daftar",
      areaHa: "Luas wajib diisi dengan angka, mis. 2,5",
      location: "Pilih lokasi: isi koordinat atau klik di peta",
    })
  })

  it("batas panjang teks memakai pesan Indonesia, bukan bawaan Zod", () => {
    const errors = errorsOf(alertInputSchema, {
      type: "banjir",
      severity: "sedang",
      title: "ab",
      regionName: "",
      description: "x".repeat(2001),
      location: { lat: -6.2, lng: 106.8 },
    })
    expect(errors).toEqual({ title: "Minimal 3 karakter", regionName: "Wajib diisi", description: "Maksimal 2000 karakter" })
  })

  it("properti tak dikenal dan enum tak valid", () => {
    expect(errorsOf(profileInputSchema, { displayName: "Dewi", admin: true })).toEqual({ _form: "Properti tidak dikenal: admin" })
    expect(errorsOf(scenarioInputSchema, { title: "Rencana", category: "lain" }).category).toBe("Pilih salah satu dari daftar")
  })

  it("tidak ada pesan bawaan Inggris pada berbagai input salah", () => {
    const messages = [
      errorsOf(fieldInputSchema, {}),
      errorsOf(fieldInputSchema, { name: 5, cropType: 1, areaHa: "abc", plantingDate: 3, location: "x", notes: "y".repeat(1001) }),
      errorsOf(scenarioInputSchema, { title: "", description: 3, category: null, location: { lat: "a" } }),
      errorsOf(alertInputSchema, { title: null, location: {} }),
    ].flatMap((errors) => Object.values(errors))
    expect(messages.length).toBeGreaterThan(8)
    for (const message of messages) {
      expect(message).not.toMatch(/Required|Expected|Invalid|must contain|received|Number must|String must/)
    }
  })
})
