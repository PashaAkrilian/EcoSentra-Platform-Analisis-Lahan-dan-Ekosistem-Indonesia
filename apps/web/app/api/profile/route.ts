import { NextResponse } from "next/server"
import type { UserProfile } from "@/lib/data/types"
import { profileInputSchema } from "@/lib/schemas"
import { requireUser, type AuthUser } from "@/server/auth"
import { FieldValue, getAdminAuth, getDb } from "@/server/firebaseAdmin"
import { deleteAllOwned } from "@/server/firestore"
import { handleRoute, readJsonBody } from "@/server/http"

// Dokumen profil disimpan di users/{uid}. Role admin TIDAK disimpan di sini
// (bisa diubah user lewat PUT) — sumbernya custom claim di ID token.
function toProfile(user: AuthUser, data: FirebaseFirestore.DocumentData | undefined): UserProfile {
  return {
    uid: user.uid,
    email: user.email,
    isAdmin: user.isAdmin,
    displayName: (data?.displayName as string | undefined) ?? user.name ?? user.email?.split("@")[0] ?? "Pengguna",
    organization: (data?.organization as string | undefined) ?? "",
  }
}

export async function GET(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser(request)
    const doc = await getDb().collection("users").doc(user.uid).get()
    return NextResponse.json(toProfile(user, doc.data()))
  })
}

export async function PUT(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser(request)
    const input = profileInputSchema.parse(await readJsonBody(request))
    const ref = getDb().collection("users").doc(user.uid)
    await ref.set({ ...input, email: user.email, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    return NextResponse.json(toProfile(user, (await ref.get()).data()))
  })
}

/**
 * Hapus akun beserta SEMUA data milik user (lahan, riwayat analisis, skenario,
 * profil) lalu hapus akun login. Tidak bisa dibatalkan. Peringatan publik
 * yang pernah diterbitkan admin tetap ada (konten publik, bukan data pribadi).
 */
export async function DELETE(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser(request)
    // Urutan: data dulu, akun login terakhir — kalau gagal di tengah, user masih bisa login & mencoba lagi.
    for (const collection of ["landCoverSnapshots", "decisions", "fields"] as const) {
      await deleteAllOwned(collection, user.uid)
    }
    await getDb().collection("users").doc(user.uid).delete()
    await getAdminAuth().deleteUser(user.uid)
    return new NextResponse(null, { status: 204 })
  })
}
