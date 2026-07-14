import type { FireHotspotCount } from "./types"

const MOCK_DELAY_MS = 500

/**
 * Jumlah titik api (hotspot) terdeteksi dari data satelit (NASA FIRMS).
 *
 * GANTI bagian ini dengan fetch ke API asli setelah backend siap, lihat
 * docs/api-contracts.md#get-apidashboardfire-hotspot-count
 */
export async function getFireHotspotCount(): Promise<FireHotspotCount> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))

  return {
    last24h: 7,
    last7d: 34,
    highConfidence: 4,
    lastDetectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  }
}
