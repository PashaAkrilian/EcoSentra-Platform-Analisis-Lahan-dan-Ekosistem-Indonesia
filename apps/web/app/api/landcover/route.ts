import { NextResponse } from "next/server"
import { landCoverQuerySchema, searchParamsToObject } from "@/lib/schemas"
import { handleRoute } from "@/server/http"
import { enforceRateLimit } from "@/server/rateLimit"
import { analyzeLandCover } from "@/server/sources/landcover"

export async function GET(request: Request) {
  return handleRoute(async () => {
    enforceRateLimit(request, "landcover", 10, 60_000)
    const { lat, lng, buffer } = landCoverQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams))
    return NextResponse.json(await analyzeLandCover(lat, lng, buffer), {
      headers: { "Cache-Control": "public, s-maxage=86400" },
    })
  })
}
