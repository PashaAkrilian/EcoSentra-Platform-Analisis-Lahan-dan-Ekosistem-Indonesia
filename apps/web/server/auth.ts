import "server-only"
import { FirebaseNotConfiguredError, getAdminAuth } from "@/server/firebaseAdmin"
import { HttpError } from "@/server/http"

export interface AuthUser {
  uid: string
  email: string | null
  /** Nama tampilan dari akun login (klaim `name` di ID token), bila ada. */
  name: string | null
  isAdmin: boolean
}

/**
 * Verifikasi Firebase ID token dari header `Authorization: Bearer <token>`.
 * Klien mendapat token ini dari Firebase Auth (lihat components/auth-provider.tsx)
 * dan mengirimnya lewat lib/api-client.ts.
 *
 * Admin ditandai lewat custom claim `admin: true` — di-set manual memakai
 * Admin SDK (lihat docs/security-checklist.md), tidak bisa di-set user sendiri.
 */
export async function requireUser(request: Request): Promise<AuthUser> {
  const header = request.headers.get("authorization")
  const match = header?.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    throw new HttpError(401, "Login diperlukan untuk mengakses data ini.")
  }

  const auth = getAdminAuth() // lempar FirebaseNotConfiguredError kalau belum dikonfigurasi

  try {
    const decoded = await auth.verifyIdToken(match[1]!)
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: typeof decoded.name === "string" && decoded.name ? decoded.name : null,
      isAdmin: decoded.admin === true,
    }
  } catch (error) {
    if (error instanceof FirebaseNotConfiguredError) throw error
    throw new HttpError(401, "Sesi tidak valid atau sudah kedaluwarsa. Silakan login ulang.")
  }
}

export async function requireAdmin(request: Request): Promise<AuthUser> {
  const user = await requireUser(request)
  if (!user.isAdmin) {
    throw new HttpError(403, "Hanya admin yang boleh melakukan aksi ini.")
  }
  return user
}
