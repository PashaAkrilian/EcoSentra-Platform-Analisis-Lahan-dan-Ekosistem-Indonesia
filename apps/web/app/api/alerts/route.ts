import { NextResponse } from "next/server"
import type { Alert } from "@/lib/data/types"
import { alertInputSchema } from "@/lib/schemas"
import { requireAdmin } from "@/server/auth"
import { FieldValue, getDb, isFirebaseAdminConfigured } from "@/server/firebaseAdmin"
import { serializeDoc } from "@/server/firestore"
import { handleRoute, readJsonBody } from "@/server/http"

/**
 * Peringatan yang dikurasi admin (melengkapi peringatan otomatis dari
 * BMKG & FIRMS di halaman Peringatan Bencana). Baca: publik. Tulis: admin.
 * Kalau Firebase belum dikonfigurasi, GET tetap 200 dengan daftar kosong
 * supaya halaman publik tetap jalan.
 */
export async function GET() {
  return handleRoute(async () => {
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json({ configured: false, alerts: [] })
    }
    const snapshot = await getDb().collection("alerts").orderBy("createdAt", "desc").limit(100).get()
    const alerts = snapshot.docs.map((doc) => {
      const { createdBy: _createdBy, ...alert } = serializeDoc<Alert & { createdBy?: string }>(doc)
      return alert
    })
    return NextResponse.json(
      { configured: true, alerts },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    )
  })
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const admin = await requireAdmin(request)
    const input = alertInputSchema.parse(await readJsonBody(request))
    const ref = await getDb()
      .collection("alerts")
      .add({ ...input, createdBy: admin.uid, createdAt: FieldValue.serverTimestamp() })
    return NextResponse.json(serializeDoc<Alert>(await ref.get()), { status: 201 })
  })
}
