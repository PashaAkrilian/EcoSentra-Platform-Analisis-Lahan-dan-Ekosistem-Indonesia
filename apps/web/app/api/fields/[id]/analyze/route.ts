import { NextResponse } from "next/server"
import type { Field, LandCoverSnapshot } from "@/lib/data/types"
import { requireUser } from "@/server/auth"
import { createOwned, getOwnedSnapshot, serializeDoc } from "@/server/firestore"
import { handleRoute } from "@/server/http"
import { enforceRateLimit } from "@/server/rateLimit"
import { analyzeLandCover, bufferForArea } from "@/server/sources/landcover"

type Params = { params: Promise<{ id: string }> }

/**
 * Analisis tutupan lahan untuk lokasi lahan milik user, simpan hasilnya
 * sebagai snapshot, dan perbarui ringkasan `lastAnalysis` di dokumen lahan.
 * Hasil dihitung di server — klien tidak bisa mengirim hasil analisis sendiri.
 */
export async function POST(request: Request, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireUser(request)
    enforceRateLimit(request, "field-analyze", 10, 60_000)

    const fieldDoc = await getOwnedSnapshot("fields", (await params).id, user.uid)
    const field = serializeDoc<Field>(fieldDoc)
    const result = await analyzeLandCover(field.location.lat, field.location.lng, bufferForArea(field.areaHa))

    const { source, ...analysis } = result
    const snapshot = await createOwned<LandCoverSnapshot>("landCoverSnapshots", user.uid, {
      ...analysis,
      fieldId: field.id,
      dataset: source.dataset,
      year: source.year,
    })

    await fieldDoc.ref.update({
      lastAnalysis: {
        dominantClass: result.dominantClass,
        dataset: `${source.dataset} (${source.year})`,
        analyzedAt: snapshot.createdAt ?? new Date().toISOString(),
      },
    })

    return NextResponse.json(snapshot, { status: 201 })
  })
}
