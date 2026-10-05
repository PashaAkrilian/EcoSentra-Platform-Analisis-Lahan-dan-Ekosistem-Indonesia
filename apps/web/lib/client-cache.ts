const TTL_MS = 5 * 60 * 1000

interface Entry {
  value: unknown
  expiresAt: number
}

const store = new Map<string, Entry>()
const inflight = new Map<string, Promise<unknown>>()

/**
 * GET JSON dengan cache memori + deduplikasi request bersamaan, dipakai
 * bersama oleh beberapa komponen (mis. titik api 24 jam dipakai layer peta
 * sekaligus panel analisis titik). Tidak memakai AbortSignal: request
 * dibagi antar pemanggil, jadi satu pemanggil tidak boleh membatalkan yang lain.
 */
export function fetchCached<T>(url: string, ttlMs = TTL_MS): Promise<T> {
  const hit = store.get(url)
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.value as T)

  const pending = inflight.get(url)
  if (pending) return pending as Promise<T>

  const request = fetch(url)
    .then(async (response) => {
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error((payload as { error?: string } | null)?.error ?? `Permintaan gagal (status ${response.status}).`)
      }
      store.set(url, { value: payload, expiresAt: Date.now() + ttlMs })
      return payload as T
    })
    .finally(() => inflight.delete(url))

  inflight.set(url, request)
  return request
}

export function invalidateCached(prefix = "") {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key)
}
