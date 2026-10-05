import "server-only"

interface Entry<T> {
  value?: T
  /** Nilai dianggap segar sampai waktu ini. */
  expiresAt: number
  /** Setelah ini nilai terlalu basi dan tidak boleh disajikan lagi. */
  staleUntil: number
  inflight?: Promise<T>
}

const store = new Map<string, Entry<unknown>>()

export interface CacheOptions {
  /**
   * Berapa lama nilai kedaluwarsa masih boleh disajikan sambil diperbarui di
   * latar belakang (stale-while-revalidate). Default: 6x TTL.
   */
  staleMs?: number
}

/**
 * Memoize hasil `loader` per `key` selama `ttlMs`, in-memory per instance.
 *
 * - Request bersamaan untuk key yang sama berbagi satu panggilan `loader`.
 * - **Stale-while-revalidate**: nilai yang sudah lewat TTL tapi belum lewat
 *   `staleMs` langsung disajikan, dan pembaruan berjalan di latar belakang.
 *   Pengguna jadi tidak menunggu sumber eksternal yang lambat (CSV FIRMS
 *   butuh 5-60 detik dari Indonesia) setelah panggilan pertama.
 * - Kalau pembaruan gagal tapi masih ada nilai lama, nilai lama dipakai dan
 *   percobaan ulang dijadwalkan dalam ≤ 60 detik.
 *
 * Dipakai alih-alih fetch cache Next.js karena beberapa sumber melewati batas
 * 2 MB data cache Next, dan yang disimpan di sini adalah hasil yang sudah
 * diparsing & difilter (jauh lebih kecil).
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  { staleMs = ttlMs * 6 }: CacheOptions = {},
): Promise<T> {
  const now = Date.now()
  const entry = store.get(key) as Entry<T> | undefined

  if (entry?.value !== undefined && entry.expiresAt > now) return entry.value

  const refresh = () => {
    const current = store.get(key) as Entry<T> | undefined
    if (current?.inflight) return current.inflight

    const inflight = loader()
      .then((value) => {
        store.set(key, { value, expiresAt: Date.now() + ttlMs, staleUntil: Date.now() + ttlMs + staleMs })
        return value
      })
      .catch((error: unknown) => {
        const previous = store.get(key) as Entry<T> | undefined
        if (previous?.value !== undefined && previous.staleUntil > Date.now()) {
          console.warn(`cache[${key}]: sumber gagal, memakai data lama:`, error instanceof Error ? error.message : error)
          store.set(key, {
            value: previous.value,
            expiresAt: Date.now() + Math.min(ttlMs, 60_000),
            staleUntil: previous.staleUntil,
          })
          return previous.value
        }
        store.delete(key)
        throw error
      })

    store.set(key, {
      value: current?.value,
      expiresAt: current?.expiresAt ?? 0,
      staleUntil: current?.staleUntil ?? 0,
      inflight,
    })
    return inflight
  }

  // Basi tapi masih layak: sajikan sekarang, perbarui diam-diam.
  if (entry?.value !== undefined && entry.staleUntil > now) {
    void refresh().catch(() => undefined)
    return entry.value
  }

  return refresh()
}

/** Hanya untuk test. */
export function clearCache() {
  store.clear()
}
