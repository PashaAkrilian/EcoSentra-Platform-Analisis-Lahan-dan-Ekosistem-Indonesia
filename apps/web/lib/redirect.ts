/**
 * Path tujuan setelah login dari parameter `?next=`. Hanya path relatif di
 * situs ini yang diterima — "//evil.com", "https://evil.com", dan
 * "/\evil.com" (ditafsirkan browser sebagai //) ditolak supaya halaman login
 * tidak bisa dipakai sebagai open redirect.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback
  if (/[\u0000-\u001f]/.test(raw)) return fallback
  return raw
}
