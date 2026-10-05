import { NextResponse } from "next/server"
import type { Alert } from "@/lib/data/types"
import { alertUpdateSchema } from "@/lib/schemas"
import { requireAdmin } from "@/server/auth"
import { getDb } from "@/server/firebaseAdmin"
import { serializeDoc } from "@/server/firestore"
import { handleRoute, HttpError, readJsonBody } from "@/server/http"

type Params = { params: Promise<{ id: string }> }

async function getAlertRef(id: string) {
  const ref = getDb().collection("alerts").doc(id)
  if (id.includes("/") || !(await ref.get()).exists) throw new HttpError(404, "Peringatan tidak ditemukan.")
  return ref
}

export async function PATCH(request: Request, { params }: Params) {
  return handleRoute(async () => {
    await requireAdmin(request)
    const input = alertUpdateSchema.parse(await readJsonBody(request))
    const ref = await getAlertRef((await params).id)
    await ref.update(input)
    return NextResponse.json(serializeDoc<Alert>(await ref.get()))
  })
}

export async function DELETE(request: Request, { params }: Params) {
  return handleRoute(async () => {
    await requireAdmin(request)
    const ref = await getAlertRef((await params).id)
    await ref.delete()
    return new NextResponse(null, { status: 204 })
  })
}
