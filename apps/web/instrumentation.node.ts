import { setDefaultAutoSelectFamilyAttemptTimeout } from "node:net"

/**
 * Penyiapan server (runtime Node.js), dijalankan dari instrumentation.ts.
 *
 * 1. Batas percobaan koneksi Node (happy eyeballs, `autoSelectFamily`) secara
 *    default hanya 250 ms per alamat. Dari server yang jauh dari AS — termasuk
 *    Indonesia — handshake TCP ke NASA/Esri/ORNL bisa ±250-300 ms, sehingga
 *    `fetch` gagal dengan "fetch failed (ETIMEDOUT)" padahal `curl` ke host yang
 *    sama berhasil. Kita naikkan batasnya supaya fetch ke sumber data stabil.
 *
 * 2. Pemanasan cache: CSV titik api NASA berukuran 1-6 MB dan dari Indonesia
 *    bisa butuh puluhan detik. Mengunduhnya di latar belakang saat start
 *    membuat request pertama pengguna tidak perlu menunggu.
 */
setDefaultAutoSelectFamilyAttemptTimeout(Number(process.env.NET_ATTEMPT_TIMEOUT_MS) || 5000)

if (process.env.DISABLE_CACHE_WARMUP !== "1") {
  void (async () => {
    const { getHotspotDataset } = await import("@/server/sources/firms")
    const { getEarthquakes } = await import("@/server/sources/bmkg")
    await Promise.allSettled([getHotspotDataset("24h"), getHotspotDataset("7d"), getEarthquakes()])
  })().catch(() => undefined)
}
