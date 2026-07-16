import type { LandCoverStats } from "./types"

const MOCK_DELAY_MS = 700

/**
 * Ringkasan hasil klasifikasi tutupan lahan di seluruh area yang dipantau.
 *
 * GANTI bagian ini dengan fetch ke API asli setelah layanan GEE
 * (services/geo) siap, lihat docs/api-contracts.md#get-apidashboardlandcover-stats
 */
export async function getLandCoverStats(): Promise<LandCoverStats> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))

  return {
    totalAreaClassifiedHa: 1245.8,
    dominantClass: "Cropland",
    classBreakdown: [
      { name: "Cropland", percentage: 42.3 },
      { name: "Tree cover", percentage: 31.5 },
      { name: "Built-up", percentage: 14.2 },
      { name: "Grassland", percentage: 9.1 },
      { name: "Water bodies", percentage: 2.9 },
    ],
    regionsAnalyzed: 12,
    lastUpdated: new Date().toISOString(),
  }
}
