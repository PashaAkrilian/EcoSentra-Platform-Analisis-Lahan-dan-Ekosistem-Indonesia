import { NextResponse } from "next/server"
import { provincesGeoJson } from "@/server/geo/indonesia"

// Batas 34 provinsi (geoBoundaries, ODbL) untuk layer peta. Statis -> cache lama.
export async function GET() {
  return NextResponse.json(provincesGeoJson(), {
    headers: {
      "Content-Type": "application/geo+json; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
    },
  })
}
