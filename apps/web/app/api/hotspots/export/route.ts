import { hotspotExportQuerySchema, searchParamsToObject } from "@/lib/schemas"
import { toCsv, toGeoJson, toKml } from "@/server/export/hotspots"
import { handleRoute, HttpError } from "@/server/http"
import { enforceRateLimit } from "@/server/rateLimit"
import { getHotspotDataset } from "@/server/sources/firms"

const MAX_EXPORT_FEATURES = 25_000

const CONTENT_TYPES = {
  geojson: "application/geo+json; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  kml: "application/vnd.google-earth.kml+xml; charset=utf-8",
} as const

export async function GET(request: Request) {
  return handleRoute(async () => {
    enforceRateLimit(request, "hotspots-export", 10, 60_000)
    const { range, province, format } = hotspotExportQuerySchema.parse(
      searchParamsToObject(new URL(request.url).searchParams),
    )

    const dataset = await getHotspotDataset(range)
    const hotspots = province ? dataset.hotspots.filter((h) => h.provinceIso === province) : dataset.hotspots
    if (hotspots.length > MAX_EXPORT_FEATURES) {
      throw new HttpError(
        413,
        `Terlalu banyak titik api (${hotspots.length.toLocaleString("id-ID")}) untuk satu file. Pilih provinsi atau rentang waktu yang lebih pendek.`,
      )
    }

    const stamp = dataset.fetchedAt.slice(0, 10)
    const scope = province ? `_${province.toLowerCase()}` : ""
    const filename = `titik-api_${range}${scope}_${stamp}.${format}`
    const body =
      format === "csv"
        ? toCsv(hotspots)
        : format === "kml"
          ? toKml(hotspots, `Titik api ${range} — EcoSentra`)
          : toGeoJson(hotspots)

    return new Response(body, {
      headers: {
        "Content-Type": CONTENT_TYPES[format],
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, s-maxage=600",
      },
    })
  })
}
