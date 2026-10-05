import { NextResponse } from "next/server"
import { hotspotQuerySchema, searchParamsToObject } from "@/lib/schemas"
import { handleRoute } from "@/server/http"
import { getHotspotDataset, summarizeHotspots } from "@/server/sources/firms"

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { range, province } = hotspotQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams))
    const dataset = await getHotspotDataset(range)
    const hotspots = province ? dataset.hotspots.filter((h) => h.provinceIso === province) : dataset.hotspots

    return NextResponse.json(summarizeHotspots({ ...dataset, hotspots }), {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" },
    })
  })
}
