import { z } from "zod"

// Field yang di-generate server sendiri - caller tidak boleh mengirim ini
// di body, supaya tidak bisa di-override (mis. memalsukan createdAt).
const RESERVED_FIELDS = ["id", "createdAt"] as const

// Skema generik untuk body POST route Firestore CRUD (fields, alerts,
// decisions, dst). Sengaja tidak menebak bentuk field spesifik tiap
// koleksi - hanya memastikan body adalah objek JSON yang valid (bukan
// array/string/null), tidak kosong, dan tidak berisi field reserved di
// atas. Skema per-koleksi yang lebih ketat bisa menyusul kalau bentuk
// data tiap koleksi sudah didefinisikan secara eksplisit.
export const genericDocumentBodySchema = z
  .object({})
  .passthrough()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Body tidak boleh kosong",
  })
  .refine((obj) => !RESERVED_FIELDS.some((field) => field in obj), {
    message: `Body tidak boleh berisi field yang di-generate server: ${RESERVED_FIELDS.join(", ")}`,
  })

const MAX_BODY_BYTES = 100_000 // Firestore max 1 MiB/dokumen - kita jauh lebih ketat di sini

export type ParsedBodyResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; status: number; message: string }

/**
 * Baca & validasi body JSON dari Request memakai genericDocumentBodySchema.
 * Dipakai di semua route POST app/api/* yang belum punya skema spesifik.
 */
export async function parseJsonBody(request: Request): Promise<ParsedBodyResult> {
  const text = await request.text()

  if (text.length > MAX_BODY_BYTES) {
    return { success: false, status: 413, message: `Body terlalu besar (maks ${MAX_BODY_BYTES} byte)` }
  }

  let json: unknown
  try {
    json = text ? JSON.parse(text) : undefined
  } catch {
    return { success: false, status: 400, message: "Body harus berupa JSON yang valid" }
  }

  const result = genericDocumentBodySchema.safeParse(json)
  if (!result.success) {
    return {
      success: false,
      status: 400,
      message: result.error.issues.map((issue) => issue.message).join("; "),
    }
  }

  return { success: true, data: result.data }
}
