import "server-only"
import { getClientIp, HttpError } from "@/server/http"

const hits = new Map<string, number[]>()
const MAX_KEYS = 10_000

/**
 * Rate limit sliding-window in-memory per instance.
 *
 * Sama seperti slowapi di services/geo: jaring pengaman awal supaya satu
 * sumber tidak membanjiri layanan eksternal (Esri, ORNL, LLM) lewat route
 * kita — bukan pertahanan anti-abuse yang kuat (reset saat restart, tidak
 * berbagi state antar instance). Untuk multi-instance, ganti dengan store
 * bersama (mis. Redis) atau rate limit di level CDN.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const windowStart = now - windowMs
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart)

  if (recent.length >= limit) {
    hits.set(key, recent)
    const retryAfterMs = recent[0]! + windowMs - now
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
  }

  recent.push(now)
  hits.set(key, recent)

  if (hits.size > MAX_KEYS) {
    for (const [k, timestamps] of hits) {
      if (timestamps.every((t) => t <= windowStart)) hits.delete(k)
    }
  }

  return { allowed: true, retryAfterSeconds: 0 }
}

/** Lempar HTTP 429 kalau IP klien melewati `limit` request per `windowMs` untuk `bucket` ini. */
export function enforceRateLimit(request: Request, bucket: string, limit: number, windowMs: number) {
  const { allowed, retryAfterSeconds } = checkRateLimit(`${bucket}:${getClientIp(request)}`, limit, windowMs)
  if (!allowed) {
    throw new HttpError(429, `Terlalu banyak permintaan. Coba lagi dalam ${retryAfterSeconds} detik.`, {
      "Retry-After": String(retryAfterSeconds),
    })
  }
}

/** Hanya untuk test. */
export function resetRateLimits() {
  hits.clear()
}
