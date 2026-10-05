import "server-only"

interface Entry<T> {
  value?: T
  expiresAt: number
  inflight?: Promise<T>
}

const store = new Map<string, Entry<unknown>>()

/**
 * Memoize hasil `loader` per `key` selama `ttlMs`, in-memory per instance.
 *
 * - Request bersamaan untuk key yang sama berbagi satu panggilan `loader`.
 * - Kalau `loader` gagal tapi masih ada nilai lama, nilai lama dipakai
 *   (lebih baik data agak basi daripada halaman error saat sumber eksternal
 *   seperti FIRMS/BMKG sedang lambat).
 *
 * Dipakai alih-alih fetch cache Next.js karena beberapa sumber (CSV FIRMS
 * ±1.5 MB) melewati batas 2 MB data cache Next, dan yang disimpan di sini
 * adalah hasil yang sudah diparsing & difilter (jauh lebih kecil).
 */
export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const entry = store.get(key) as Entry<T> | undefined

  if (entry?.value !== undefined && entry.expiresAt > now) return entry.value
  if (entry?.inflight) return entry.inflight

  const inflight = loader()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    })
    .catch((error: unknown) => {
      if (entry?.value !== undefined) {
        console.warn(`cache[${key}]: sumber gagal, memakai data lama:`, error instanceof Error ? error.message : error)
        store.set(key, { value: entry.value, expiresAt: Date.now() + Math.min(ttlMs, 60_000) })
        return entry.value
      }
      store.delete(key)
      throw error
    })

  store.set(key, { ...entry, expiresAt: entry?.expiresAt ?? 0, inflight })
  return inflight
}

/** Hanya untuk test. */
export function clearCache() {
  store.clear()
}
