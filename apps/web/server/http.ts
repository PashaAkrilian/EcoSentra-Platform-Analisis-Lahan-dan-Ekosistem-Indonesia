import "server-only"
import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { FirebaseNotConfiguredError } from "@/server/firebaseAdmin"

/** Error dengan status HTTP eksplisit — dilempar dari helper/route, ditangkap oleh `handleRoute`. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly headers?: Record<string, string>,
  ) {
    super(message)
    this.name = "HttpError"
  }
}

/** Semua response gagal memakai bentuk yang sama: `{ "error": string }`. */
export function jsonError(status: number, message: string, headers?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers })
}

/**
 * Bungkus route handler supaya semua error dipetakan ke response JSON yang
 * konsisten. Error tak terduga TIDAK diteruskan pesannya ke klien (bisa
 * berisi detail internal) — cukup dicatat di log server.
 */
export async function handleRoute(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler()
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error.status, error.message, error.headers)
    }
    if (error instanceof ZodError) {
      return jsonError(400, formatZodError(error))
    }
    if (error instanceof FirebaseNotConfiguredError) {
      return jsonError(503, error.message)
    }
    console.error("Unhandled API error:", error instanceof Error ? error.message : error)
    return jsonError(500, "Terjadi kesalahan pada server.")
  }
}

export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => (issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ")
}

const MAX_BODY_BYTES = 100_000 // Firestore max 1 MiB/dokumen — di sini jauh lebih ketat

/** Baca body JSON dengan batas ukuran. Validasi skema dilakukan pemanggil. */
export async function readJsonBody(request: Request, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  const text = await request.text()
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new HttpError(413, `Body terlalu besar (maks ${maxBytes} byte).`)
  }
  if (!text) {
    throw new HttpError(400, "Body tidak boleh kosong.")
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new HttpError(400, "Body harus berupa JSON yang valid.")
  }
}

/** IP klien untuk rate limiting (di belakang proxy/CDN: header x-forwarded-for). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]!.trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}
