import { NextResponse } from "next/server"
import { hotspotQuerySchema, searchParamsToObject } from "@/lib/schemas"
import { toCompact } from "@/server/export/hotspots"
import { handleRoute, HttpError } from "@/server/http"
import { getHotspotDataset, summarizeHotspots } from "@/server/sources/firms"

// Titik api untuk peta (format ringkas). Rentang 7 hari terlalu besar untuk
// dirender sebagai titik (±50 ribu) — pakai /api/hotspots/summary untuk itu.
export async function GET(request: Request) {
  return handleRoute(async () => {
    const { range, province } = hotspotQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams))
    if (range === "7d" && !province) {
      throw new HttpError(400, "Rentang 7d hanya tersedia per provinsi (parameter province) atau lewat /api/hotspots/summary.")
    }

    const dataset = await getHotspotDataset(range)
    const hotspots = province ? dataset.hotspots.filter((h) => h.provinceIso === province) : dataset.hotspots

    return NextResponse.json(
      { ...summarizeHotspots({ ...dataset, hotspots }), points: hotspots.map(toCompact) },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } },
    )
  })
}
