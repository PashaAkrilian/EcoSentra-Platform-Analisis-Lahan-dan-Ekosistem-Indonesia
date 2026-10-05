import { NextResponse } from "next/server"
import type { LandCoverSnapshot } from "@/lib/data/types"
import { requireUser } from "@/server/auth"
import { listOwned } from "@/server/firestore"
import { handleRoute, HttpError } from "@/server/http"

export async function GET(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser(request)
    const fieldId = new URL(request.url).searchParams.get("fieldId")
    if (fieldId !== null && (fieldId.length === 0 || fieldId.length > 200)) {
      throw new HttpError(400, "fieldId tidak valid.")
    }
    const snapshots = await listOwned<LandCoverSnapshot>("landCoverSnapshots", user.uid, fieldId ? { fieldId } : {})
    return NextResponse.json(snapshots)
  })
}
