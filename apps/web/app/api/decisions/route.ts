import { NextResponse } from "next/server"
import type { Scenario } from "@/lib/data/types"
import { scenarioInputSchema } from "@/lib/schemas"
import { requireUser } from "@/server/auth"
import { createOwned, listOwned } from "@/server/firestore"
import { handleRoute, readJsonBody } from "@/server/http"

export async function GET(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser(request)
    return NextResponse.json(await listOwned<Scenario>("decisions", user.uid))
  })
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser(request)
    const input = scenarioInputSchema.parse(await readJsonBody(request))
    return NextResponse.json(await createOwned<Scenario>("decisions", user.uid, input), { status: 201 })
  })
}
