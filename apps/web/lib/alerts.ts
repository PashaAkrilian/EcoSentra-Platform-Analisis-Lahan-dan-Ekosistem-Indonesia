import type { Alert, Earthquake, HotspotSummary, LatLng } from "@/lib/data/types"

export type Severity = Alert["severity"]
export const SEVERITY_ORDER: Severity[] = ["kritis", "tinggi", "sedang", "rendah"]

export interface DerivedAlert {
  id: string
  kind: Alert["type"]
  severity: Severity
  title: string
  description: string
  regionName: string
  location: LatLng | null
  /** Waktu kejadian/deteksi terbaru (ISO 8601). */
  occurredAt: string | null
  source: "BMKG" | "NASA FIRMS" | "Admin"
  status: Alert["status"]
}

// Ambang batas EcoSentra — BUKAN status resmi BMKG/BNPB/KLHK. Dijelaskan juga
// di halaman Bantuan & Metodologi supaya pengguna tahu cara peringatan dibuat.
export const QUAKE_THRESHOLDS = { kritis: 7, tinggi: 6, sedang: 5 } as const
// Di bawah 20 titik/provinsi/24 jam dianggap aktivitas latar (pembakaran kecil,
// anomali panas non-api) dan tidak dijadikan peringatan.
export const FIRE_THRESHOLDS_24H = { kritis: 500, tinggi: 100, sedang: 20 } as const

export function quakeSeverity(quake: Pick<Earthquake, "magnitude" | "tsunamiPotential">): Severity {
  if (quake.tsunamiPotential || quake.magnitude >= QUAKE_THRESHOLDS.kritis) return "kritis"
  if (quake.magnitude >= QUAKE_THRESHOLDS.tinggi) return "tinggi"
  if (quake.magnitude >= QUAKE_THRESHOLDS.sedang) return "sedang"
  return "rendah"
}

export function fireSeverity(count24h: number): Severity | null {
  if (count24h >= FIRE_THRESHOLDS_24H.kritis) return "kritis"
  if (count24h >= FIRE_THRESHOLDS_24H.tinggi) return "tinggi"
  if (count24h >= FIRE_THRESHOLDS_24H.sedang) return "sedang"
  return null
}

const QUAKE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

/** Peringatan gempa dari feed BMKG (7 hari terakhir), tanpa duplikat antar feed. */
export function quakeAlerts(quakes: Earthquake[], now = Date.now()): DerivedAlert[] {
  const seen = new Set<string>()
  const alerts: DerivedAlert[] = []
  for (const quake of quakes) {
    if (seen.has(quake.id) || now - Date.parse(quake.occurredAt) > QUAKE_WINDOW_MS) continue
    seen.add(quake.id)
    const severity = quakeSeverity(quake)
    // Gempa kecil hanya dimunculkan kalau dirasakan warga.
    if (severity === "rendah" && !quake.felt) continue
    const details = [
      `Kedalaman ${quake.depthKm} km.`,
      quake.potential ? `${quake.potential}.` : null,
      quake.felt ? `Dirasakan (skala MMI): ${quake.felt}.` : null,
    ].filter(Boolean)
    alerts.push({
      id: `bmkg-${quake.id}`,
      kind: "gempa",
      severity,
      title: `Gempa M ${quake.magnitude.toFixed(1)} — ${quake.region}`,
      description: details.join(" "),
      regionName: quake.region,
      location: { lat: quake.lat, lng: quake.lng },
      occurredAt: quake.occurredAt,
      source: "BMKG",
      status: now - Date.parse(quake.occurredAt) < 24 * 60 * 60 * 1000 ? "aktif" : "dipantau",
    })
  }
  return alerts
}

/** Peringatan kebakaran per provinsi dari jumlah titik api 24 jam terakhir. */
export function fireAlerts(summary24h: HotspotSummary): DerivedAlert[] {
  return summary24h.byProvince.flatMap((province) => {
    const severity = fireSeverity(province.count)
    if (!severity) return []
    return [
      {
        id: `firms-${province.iso}`,
        kind: "kebakaran" as const,
        severity,
        title: `${province.count.toLocaleString("id-ID")} titik api di ${province.name}`,
        description: `Terdeteksi satelit ${summary24h.source.satellite} dalam 24 jam terakhir, ${province.highConfidence.toLocaleString("id-ID")} di antaranya berkeyakinan tinggi. Titik api adalah anomali panas — perlu verifikasi lapangan.`,
        regionName: `${province.name} (${province.island})`,
        location: province.center,
        occurredAt: summary24h.latestAcquiredAt,
        source: "NASA FIRMS" as const,
        status: "aktif" as const,
      },
    ]
  })
}

export function adminAlerts(alerts: Alert[]): DerivedAlert[] {
  return alerts.map((alert) => ({
    id: `admin-${alert.id}`,
    kind: alert.type,
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    regionName: alert.regionName,
    location: alert.location,
    occurredAt: alert.createdAt,
    source: "Admin" as const,
    status: alert.status,
  }))
}

/** Urutkan: tingkat keparahan dulu, lalu yang terbaru. */
export function sortAlerts(alerts: DerivedAlert[]): DerivedAlert[] {
  return [...alerts].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
      String(b.occurredAt ?? "").localeCompare(String(a.occurredAt ?? "")),
  )
}

/** Tautan ke peta yang berfokus pada lokasi peringatan. */
export function mapLink(location: LatLng | null, kind: Alert["type"]): string {
  if (!location) return "/maps"
  const layer = kind === "kebakaran" ? "&fires=1" : kind === "gempa" ? "&quakes=1" : ""
  return `/maps?lat=${location.lat}&lng=${location.lng}&zoom=${kind === "kebakaran" ? 8 : 7}${layer}`
}
