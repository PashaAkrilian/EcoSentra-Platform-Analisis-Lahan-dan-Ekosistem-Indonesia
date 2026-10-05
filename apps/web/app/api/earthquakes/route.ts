import { NextResponse } from "next/server"
import { handleRoute } from "@/server/http"
import { getEarthquakes } from "@/server/sources/bmkg"

export async function GET() {
  return handleRoute(async () =>
    NextResponse.json(await getEarthquakes(), {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    }),
  )
}
