import { NextResponse } from "next/server"
import type { Scenario } from "@/lib/data/types"
import { scenarioUpdateSchema } from "@/lib/schemas"
import { requireUser } from "@/server/auth"
import { deleteOwned, updateOwned } from "@/server/firestore"
import { handleRoute, readJsonBody } from "@/server/http"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireUser(request)
    const input = scenarioUpdateSchema.parse(await readJsonBody(request))
    return NextResponse.json(await updateOwned<Scenario>("decisions", (await params).id, user.uid, input))
  })
}

export async function DELETE(request: Request, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireUser(request)
    await deleteOwned("decisions", (await params).id, user.uid)
    return new NextResponse(null, { status: 204 })
  })
}
