import { NextResponse } from "next/server"
import type { UserProfile } from "@/lib/data/types"
import { profileInputSchema } from "@/lib/schemas"
import { requireUser, type AuthUser } from "@/server/auth"
import { FieldValue, getDb } from "@/server/firebaseAdmin"
import { handleRoute, readJsonBody } from "@/server/http"

// Dokumen profil disimpan di users/{uid}. Role admin TIDAK disimpan di sini
// (bisa diubah user lewat PUT) — sumbernya custom claim di ID token.
function toProfile(user: AuthUser, data: FirebaseFirestore.DocumentData | undefined): UserProfile {
  return {
    uid: user.uid,
    email: user.email,
    isAdmin: user.isAdmin,
    displayName: (data?.displayName as string | undefined) ?? user.email?.split("@")[0] ?? "Pengguna",
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
