import { NextResponse } from "next/server"
import { z } from "zod"
import { PROVINCES } from "@/lib/provinces"
import { searchParamsToObject } from "@/lib/schemas"
import { handleRoute, HttpError } from "@/server/http"
import { enforceRateLimit } from "@/server/rateLimit"
import { getProvinceLandCover, UnknownProvinceError } from "@/server/sources/provinceLandcover"

const querySchema = z.object({
  iso: z.string().refine((iso) => iso in PROVINCES, "iso harus kode provinsi ISO 3166-2:ID yang dikenal, mis. ID-KT"),
})

export async function GET(request: Request) {
  return handleRoute(async () => {
    enforceRateLimit(request, "ecosystem-province", 20, 60_000)
    const { iso } = querySchema.parse(searchParamsToObject(new URL(request.url).searchParams))
    try {
      return NextResponse.json(await getProvinceLandCover(iso), {
        headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
      })
    } catch (error) {
      if (error instanceof UnknownProvinceError) throw new HttpError(404, error.message)
      throw error
    }
  })
}
