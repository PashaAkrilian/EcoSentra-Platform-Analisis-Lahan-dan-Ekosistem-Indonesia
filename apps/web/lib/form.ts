import type { ZodError } from "zod"

/** Ubah ZodError jadi peta { "location.lat": "pesan", ... } untuk ditampilkan di dekat field. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form"
    if (!(key in errors)) errors[key] = issue.message
  }
  return errors
}

/** "" -> null; selain itu angka (koma desimal Indonesia diterima). NaN -> null. */
export function parseCoordinate(text: string): number | null {
  const normalized = text.trim().replace(",", ".")
  if (normalized === "") return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

export interface LatLngLike {
  lat: number
  lng: number
}

/** Dua titik sama (atau sama-sama kosong). Dipakai membedakan perubahan dari ketikan sendiri vs dari luar. */
export function sameLatLng(a: LatLngLike | null, b: LatLngLike | null): boolean {
  if (a === null || b === null) return a === b
  return a.lat === b.lat && a.lng === b.lng
}
