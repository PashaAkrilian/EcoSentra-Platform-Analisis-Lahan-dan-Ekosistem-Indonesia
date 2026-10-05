import { NextResponse } from "next/server"
import type { Field } from "@/lib/data/types"
import { fieldUpdateSchema } from "@/lib/schemas"
import { requireUser } from "@/server/auth"
import { getDb } from "@/server/firebaseAdmin"
import { deleteOwned, getOwned, updateOwned } from "@/server/firestore"
import { handleRoute, readJsonBody } from "@/server/http"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireUser(request)
    return NextResponse.json(await getOwned<Field>("fields", (await params).id, user.uid))
  })
}

export async function PATCH(request: Request, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireUser(request)
    const input = fieldUpdateSchema.parse(await readJsonBody(request))
    // Lokasi berubah -> hasil analisis lama tidak berlaku lagi.
    const data = input.location ? { ...input, lastAnalysis: null } : input
    return NextResponse.json(await updateOwned<Field>("fields", (await params).id, user.uid, data))
  })
}

export async function DELETE(request: Request, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireUser(request)
    const { id } = await params
    await deleteOwned("fields", id, user.uid)

    // Hapus juga riwayat analisis lahan ini.
    const snapshots = await getDb()
      .collection("landCoverSnapshots")
      .where("userId", "==", user.uid)
      .where("fieldId", "==", id)
      .get()
    if (!snapshots.empty) {
      const batch = getDb().batch()
      snapshots.docs.forEach((doc) => batch.delete(doc.ref))
      await batch.commit()
    }

    return new NextResponse(null, { status: 204 })
  })
}
