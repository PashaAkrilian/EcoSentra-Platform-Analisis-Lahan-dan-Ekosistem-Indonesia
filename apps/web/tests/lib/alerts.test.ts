import { describe, expect, it } from "vitest"
import { fireAlerts, fireSeverity, mapLink, quakeAlerts, quakeSeverity, sortAlerts } from "@/lib/alerts"
import type { Earthquake, HotspotSummary } from "@/lib/data/types"

const NOW = Date.parse("2026-10-05T12:00:00Z")

function quake(overrides: Partial<Earthquake>): Earthquake {
  return {
    id: "q",
    occurredAt: "2026-10-05T06:00:00.000Z",
    lat: -9.7,
    lng: 118.92,
    magnitude: 5.2,
    depthKm: 10,
    region: "14 km BaratDaya KODI",
    potential: "Tidak berpotensi tsunami",
    felt: null,
    tsunamiPotential: false,
    shakemapUrl: null,
    ...overrides,
  }
}

describe("tingkat keparahan", () => {
  it("gempa: magnitudo & potensi tsunami", () => {
    expect(quakeSeverity({ magnitude: 4.1, tsunamiPotential: false })).toBe("rendah")
    expect(quakeSeverity({ magnitude: 5.0, tsunamiPotential: false })).toBe("sedang")
    expect(quakeSeverity({ magnitude: 6.4, tsunamiPotential: false })).toBe("tinggi")
    expect(quakeSeverity({ magnitude: 7.0, tsunamiPotential: false })).toBe("kritis")
    expect(quakeSeverity({ magnitude: 5.5, tsunamiPotential: true })).toBe("kritis")
  })

  it("kebakaran: jumlah titik api 24 jam per provinsi", () => {
    expect(fireSeverity(5)).toBeNull()
    expect(fireSeverity(19)).toBeNull()
    expect(fireSeverity(20)).toBe("sedang")
    expect(fireSeverity(100)).toBe("tinggi")
    expect(fireSeverity(3078)).toBe("kritis")
  })
})

describe("quakeAlerts", () => {
  it("menghapus duplikat antar feed, membuang gempa > 7 hari & gempa kecil yang tidak dirasakan", () => {
    const alerts = quakeAlerts(
      [
        quake({ id: "a" }),
        quake({ id: "a" }),
        quake({ id: "old", occurredAt: "2026-09-20T00:00:00.000Z" }),
        quake({ id: "small", magnitude: 3.1 }),
        quake({ id: "felt", magnitude: 3.1, felt: "II-III Sikka", occurredAt: "2026-10-01T00:00:00.000Z" }),
      ],
      NOW,
    )
    expect(alerts.map((a) => [a.id, a.severity, a.status])).toEqual([
      ["bmkg-a", "sedang", "aktif"],
      ["bmkg-felt", "rendah", "dipantau"],
    ])
    expect(alerts[1]!.description).toContain("II-III Sikka")
  })
})

describe("fireAlerts & sortAlerts", () => {
  const summary = {
    source: { name: "NASA FIRMS", url: "", fetchedAt: "", satellite: "Suomi NPP VIIRS 375 m" },
    range: "24h",
    total: 3200,
    highConfidence: 100,
    latestAcquiredAt: "2026-10-05T06:00:00.000Z",
    byIsland: [],
    byDay: [],
    byProvince: [
      { iso: "ID-KT", name: "Kalimantan Tengah", island: "Kalimantan", count: 3078, highConfidence: 90, center: { lat: -2.5, lng: 113.5 } },
      { iso: "ID-JB", name: "Jawa Barat", island: "Jawa", count: 21, highConfidence: 1, center: { lat: -6.9, lng: 107.6 } },
      { iso: "ID-BA", name: "Bali", island: "Bali & Nusa Tenggara", count: 2, highConfidence: 0, center: { lat: -8.4, lng: 115.2 } },
    ],
  } satisfies HotspotSummary

  it("hanya provinsi di atas ambang yang menjadi peringatan", () => {
    const alerts = fireAlerts(summary)
    expect(alerts.map((a) => [a.regionName, a.severity])).toEqual([
      ["Kalimantan Tengah (Kalimantan)", "kritis"],
      ["Jawa Barat (Jawa)", "sedang"],
    ])
  })

  it("mengurutkan berdasarkan keparahan lalu waktu", () => {
    const sorted = sortAlerts([...fireAlerts(summary), ...quakeAlerts([quake({ id: "b", magnitude: 6.2 })], NOW)])
    expect(sorted.map((a) => a.severity)).toEqual(["kritis", "tinggi", "sedang"])
  })

  it("membuat tautan peta dengan layer yang sesuai", () => {
    expect(mapLink({ lat: -2.5, lng: 113.5 }, "kebakaran")).toBe("/maps?lat=-2.5&lng=113.5&zoom=8&fires=1")
    expect(mapLink(null, "gempa")).toBe("/maps")
  })
})
