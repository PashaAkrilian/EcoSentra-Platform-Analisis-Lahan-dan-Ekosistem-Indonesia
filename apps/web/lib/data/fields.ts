import type { FieldsSummary } from "./types"

const MOCK_DELAY_MS = 600

/**
 * Ringkasan lahan yang dipantau user.
 *
 * GANTI bagian ini dengan fetch ke API asli setelah backend siap, lihat
 * docs/api-contracts.md#get-apidashboardfields-summary
 */
export async function getFieldsSummary(): Promise<FieldsSummary> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))

  return {
    totalFields: 12,
    totalAreaHa: 348.5,
    avgHealthScore: 78,
  }
}
