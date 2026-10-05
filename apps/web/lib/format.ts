const LOCALE = "id-ID"

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return value.toLocaleString(LOCALE, { maximumFractionDigits })
}

/** "5 Okt 2026, 20.15 WIB" — waktu ditampilkan di zona WIB (Asia/Jakarta). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return `${date.toLocaleString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  })} WIB`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
}

/** "3 jam lalu", "baru saja", dst. */
export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—"
  const diffSec = Math.round((now - Date.parse(iso)) / 1000)
  if (Number.isNaN(diffSec)) return "—"
  if (diffSec < 60) return "baru saja"
  const units: [number, string][] = [
    [86_400 * 30, "bulan"],
    [86_400, "hari"],
    [3_600, "jam"],
    [60, "menit"],
  ]
  for (const [seconds, label] of units) {
    if (diffSec >= seconds) return `${Math.floor(diffSec / seconds)} ${label} lalu`
  }
  return "baru saja"
}
