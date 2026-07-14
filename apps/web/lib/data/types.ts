// Bentuk data ini adalah kontrak dengan backend — cocokkan dengan
// docs/api-contracts.md setiap kali salah satu diubah.

export interface FieldsSummary {
  totalFields: number
  totalAreaHa: number
  avgHealthScore: number // 0-100
}

export interface LandCoverClassBreakdown {
  name: string
  percentage: number
}

export interface LandCoverStats {
  totalAreaClassifiedHa: number
  dominantClass: string
  classBreakdown: LandCoverClassBreakdown[]
  regionsAnalyzed: number
  lastUpdated: string // ISO 8601
}

export interface FireHotspotCount {
  last24h: number
  last7d: number
  highConfidence: number
  lastDetectedAt: string | null // ISO 8601
}

export interface ActiveAlertsSummary {
  total: number
  bySeverity: {
    high: number
    medium: number
    low: number
  }
}
