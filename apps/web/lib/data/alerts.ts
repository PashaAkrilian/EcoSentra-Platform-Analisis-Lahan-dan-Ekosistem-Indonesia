import type { ActiveAlertsSummary } from "./types"

const MOCK_DELAY_MS = 450

/**
 * Ringkasan alert aktif (bencana/lingkungan) yang butuh perhatian.
 *
 * GANTI bagian ini dengan fetch ke API asli setelah backend siap, lihat
 * docs/api-contracts.md#get-apidashboardactive-alerts-count
 */
export async function getActiveAlertsCount(): Promise<ActiveAlertsSummary> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))

  return {
    total: 5,
    bySeverity: { high: 1, medium: 2, low: 2 },
  }
}
