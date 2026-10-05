import { NextResponse } from "next/server"
import { isFirebaseAdminConfigured } from "@/server/firebaseAdmin"

/**
 * Status integrasi (tanpa membocorkan nilai rahasia apa pun) — dipakai
 * halaman Pengaturan dan untuk monitoring uptime.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      time: new Date().toISOString(),
      integrations: {
        firebaseAdmin: isFirebaseAdminConfigured(),
        firebaseAuthClient: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
        geoService: Boolean(process.env.GEO_SERVICE_URL),
        llm: Boolean(process.env.ANTHROPIC_API_KEY),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
