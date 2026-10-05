import { z } from "zod"
import { INDONESIA_BBOX } from "@/lib/geo"
import { HOTSPOT_RANGES } from "@/lib/data/types"
import { resolveProvince } from "@/lib/province-search"

// Skema validasi bersama: dipakai API routes (server) dan form (client),
// supaya aturan validasi tidak ditulis dua kali.

// Pesan bawaan Zod berbahasa Inggris ("Required", "String must contain at least 3 character(s)")
// tampil langsung di bawah field form dan di respons API. Peta ini menerjemahkannya; pesan yang
// ditulis eksplisit di skema tetap diutamakan.
const pesanIndonesia: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined") return { message: "Wajib diisi" }
      if (issue.received === "nan" || issue.expected === "number") return { message: "Isi dengan angka" }
      return { message: "Format tidak valid" }
    case z.ZodIssueCode.invalid_enum_value:
      return { message: "Pilih salah satu dari daftar" }
    case z.ZodIssueCode.too_small:
      if (issue.type === "string") return { message: issue.minimum === 1 ? "Wajib diisi" : `Minimal ${issue.minimum} karakter` }
      if (issue.type === "array") return { message: `Minimal ${issue.minimum} item` }
      if (issue.type === "number") return { message: issue.inclusive ? `Minimal ${issue.minimum}` : `Harus lebih dari ${issue.minimum}` }
      break
    case z.ZodIssueCode.too_big:
      if (issue.type === "string") return { message: `Maksimal ${issue.maximum} karakter` }
      if (issue.type === "array") return { message: `Maksimal ${issue.maximum} item` }
      if (issue.type === "number") return { message: issue.inclusive ? `Maksimal ${issue.maximum}` : `Harus kurang dari ${issue.maximum}` }
      break
    case z.ZodIssueCode.unrecognized_keys:
      return { message: `Properti tidak dikenal: ${issue.keys.join(", ")}` }
  }
  return { message: ctx.defaultError }
}
z.setErrorMap(pesanIndonesia)

const latitude = z.coerce
  .number({ invalid_type_error: "lat harus berupa angka" })
  .min(INDONESIA_BBOX.minLat, "Koordinat harus berada di wilayah Indonesia")
  .max(INDONESIA_BBOX.maxLat, "Koordinat harus berada di wilayah Indonesia")

const longitude = z.coerce
  .number({ invalid_type_error: "lng harus berupa angka" })
  .min(INDONESIA_BBOX.minLng, "Koordinat harus berada di wilayah Indonesia")
  .max(INDONESIA_BBOX.maxLng, "Koordinat harus berada di wilayah Indonesia")

export const latLngSchema = z.object(
  { lat: latitude, lng: longitude },
  { required_error: "Pilih lokasi: isi koordinat atau klik di peta", invalid_type_error: "Lokasi tidak valid" },
)

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Tanggal tidak valid")

// --- Query parameter API data publik -----------------------------------------

export const coordinateQuerySchema = latLngSchema

export const landCoverQuerySchema = latLngSchema.extend({
  buffer: z.coerce
    .number()
    .int("buffer harus bilangan bulat (meter)")
    .min(100, "buffer minimal 100 m")
    .max(50_000, "buffer maksimal 50.000 m")
    .default(1000),
})

// Menerima kode ISO ("ID-KT"), nama ("Kalimantan Tengah"), atau singkatan umum ("kalteng");
// hasilnya selalu kode ISO. Klien API (mis. MCP) tidak perlu punya daftar provinsi sendiri.
const provinceIso = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value.trim() === "") return undefined
    const province = resolveProvince(value)
    if (!province) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "province tidak dikenali — gunakan nama provinsi atau kode ISO 3166-2:ID, mis. ID-KT",
      })
      return z.NEVER
    }
    return province.iso
  })

export const hotspotQuerySchema = z.object({
  range: z.enum(HOTSPOT_RANGES).default("24h"),
  province: provinceIso,
})

export const hotspotExportQuerySchema = hotspotQuerySchema.extend({
  format: z.enum(["geojson", "csv", "kml"]).default("geojson"),
})

// --- Dokumen Firestore milik user ---------------------------------------------

export const CROP_TYPES = [
  "Padi",
  "Jagung",
  "Kedelai",
  "Kelapa sawit",
  "Karet",
  "Kopi",
  "Kakao",
  "Tebu",
  "Hortikultura",
  "Hutan tanaman",
  "Lainnya",
] as const

export const fieldInputSchema = z
  .object({
    name: z.string().trim().min(1, "Nama lahan wajib diisi").max(100),
    cropType: z.enum(CROP_TYPES, { errorMap: () => ({ message: "Pilih jenis tanaman dari daftar" }) }),
    areaHa: z.coerce
      .number({ invalid_type_error: "Luas wajib diisi dengan angka, mis. 2,5" })
      .positive("Luas harus lebih dari 0")
      .max(1_000_000, "Luas maksimal 1.000.000 ha"),
    plantingDate: isoDate.nullable().default(null),
    location: latLngSchema,
    notes: z.string().trim().max(1000).default(""),
  })
  .strict()

export const fieldUpdateSchema = fieldInputSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Tidak ada field yang diubah")

export const SCENARIO_CATEGORIES = ["pertanian", "kehutanan", "kebencanaan", "konservasi"] as const
export const SCENARIO_STATUSES = ["draf", "berjalan", "selesai"] as const
export const SCENARIO_PRIORITIES = ["rendah", "sedang", "tinggi"] as const

export const scenarioInputSchema = z
  .object({
    title: z.string().trim().min(3, "Judul minimal 3 karakter").max(150),
    description: z.string().trim().max(2000).default(""),
    category: z.enum(SCENARIO_CATEGORIES),
    status: z.enum(SCENARIO_STATUSES).default("draf"),
    priority: z.enum(SCENARIO_PRIORITIES).default("sedang"),
    location: latLngSchema.nullable().default(null),
    deadline: isoDate.nullable().default(null),
  })
  .strict()

export const scenarioUpdateSchema = scenarioInputSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Tidak ada field yang diubah")

export const ALERT_TYPES = ["kebakaran", "banjir", "kekeringan", "longsor", "gempa", "lainnya"] as const
export const ALERT_SEVERITIES = ["rendah", "sedang", "tinggi", "kritis"] as const
export const ALERT_STATUSES = ["aktif", "dipantau", "selesai"] as const

export const alertInputSchema = z
  .object({
    type: z.enum(ALERT_TYPES),
    severity: z.enum(ALERT_SEVERITIES),
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().max(2000).default(""),
    location: latLngSchema,
    regionName: z.string().trim().min(1).max(150),
    status: z.enum(ALERT_STATUSES).default("aktif"),
  })
  .strict()

export const alertUpdateSchema = alertInputSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Tidak ada field yang diubah")

export const profileInputSchema = z
  .object({
    displayName: z.string().trim().min(1, "Nama wajib diisi").max(80),
    organization: z.string().trim().max(120).default(""),
  })
  .strict()

// --- LandAI -----------------------------------------------------------------

export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30)
    .refine((messages) => messages.at(-1)?.role === "user", "Pesan terakhir harus dari user"),
  /** Konteks opsional dari halaman, mis. titik yang sedang dipilih di peta. */
  context: z
    .object({
      location: latLngSchema.optional(),
    })
    .optional(),
})

/** Ambil query string sebagai objek biasa untuk divalidasi Zod. */
export function searchParamsToObject(searchParams: URLSearchParams): Record<string, string> {
  return Object.fromEntries(searchParams.entries())
}
