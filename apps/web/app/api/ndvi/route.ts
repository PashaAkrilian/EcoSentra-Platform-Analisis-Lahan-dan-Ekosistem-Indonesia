import { NextResponse } from "next/server"
import { coordinateQuerySchema, searchParamsToObject } from "@/lib/schemas"
import { handleRoute } from "@/server/http"
import { enforceRateLimit } from "@/server/rateLimit"
import { getNdviSeries } from "@/server/sources/modisNdvi"

export async function GET(request: Request) {
  return handleRoute(async () => {
    enforceRateLimit(request, "ndvi", 10, 60_000)
    const { lat, lng } = coordinateQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams))
    return NextResponse.json(await getNdviSeries(lat, lng), {
      headers: { "Cache-Control": "public, s-maxage=43200" },
    })
  })
}
