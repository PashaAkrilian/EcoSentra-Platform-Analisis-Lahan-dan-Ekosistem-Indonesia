import { NextResponse } from "next/server"
import type { Field } from "@/lib/data/types"
import { fieldInputSchema } from "@/lib/schemas"
import { requireUser } from "@/server/auth"
import { createOwned, listOwned } from "@/server/firestore"
import { handleRoute, readJsonBody } from "@/server/http"

export async function GET(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser(request)
    return NextResponse.json(await listOwned<Field>("fields", user.uid))
  })
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser(request)
    const input = fieldInputSchema.parse(await readJsonBody(request))
    const field = await createOwned<Field>("fields", user.uid, { ...input, lastAnalysis: null })
    return NextResponse.json(field, { status: 201 })
  })
}
