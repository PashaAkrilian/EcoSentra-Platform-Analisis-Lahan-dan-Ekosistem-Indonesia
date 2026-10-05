import { NextResponse } from "next/server"
import { coordinateQuerySchema, searchParamsToObject } from "@/lib/schemas"
import { handleRoute } from "@/server/http"
import { enforceRateLimit } from "@/server/rateLimit"
import { getWeather } from "@/server/sources/openMeteo"

export async function GET(request: Request) {
  return handleRoute(async () => {
    enforceRateLimit(request, "weather", 30, 60_000)
    const { lat, lng } = coordinateQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams))
    return NextResponse.json(await getWeather(lat, lng), {
      headers: { "Cache-Control": "public, s-maxage=900" },
    })
  })
}
