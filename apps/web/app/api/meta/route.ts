import { NextResponse } from "next/server"
import { latestEsriYear } from "@/server/sources/landcover"

// Metadata dinamis untuk klien: saat ini tahun terbaru peta tutupan lahan Esri
// (dipakai layer tile di halaman peta). Gagal -> null, klien memakai nilai cadangan.
export async function GET() {
  const landcoverYear = await latestEsriYear().catch(() => null)
  return NextResponse.json(
    { landcoverYear },
    { headers: { "Cache-Control": landcoverYear ? "public, s-maxage=86400" : "public, s-maxage=60" } },
  )
}
