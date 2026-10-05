/** Error dari API routes — membawa status HTTP & pesan `{ error }` dari server. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  /** Firebase ID token — wajib untuk route data milik user. */
  token?: string | null
  signal?: AbortSignal
}

export async function apiFetch<T>(path: string, { method = "GET", body, token, signal }: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error
    throw new ApiError(0, "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.")
  }

  if (response.status === 204) return undefined as T

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (payload as { error?: string } | null)?.error ?? `Permintaan gagal (status ${response.status}).`
    throw new ApiError(response.status, message)
  }
  return payload as T
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Terjadi kesalahan."
}
