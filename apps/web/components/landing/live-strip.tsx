"use client"

import { Activity, Flame, Sprout } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import type { EarthquakesResponse, HotspotSummary } from "@/lib/data/types"
import { formatNumber, formatRelative } from "@/lib/format"

/** Tiga angka langsung (dari API yang sama dengan dashboard) di beranda. Gagal -> bagian disembunyikan, bukan diisi angka palsu. */
export function LiveStrip() {
  const fires = useApi<HotspotSummary>("/api/hotspots/summary?range=24h")
  const quakes = useApi<EarthquakesResponse>("/api/earthquakes")

  if (fires.error && quakes.error) return null

  const quake = quakes.data?.recent[0] ?? null
  const items = [
    {
      icon: Flame,
      color: "bg-orange-100 text-orange-700",
      label: "Titik api, 24 jam terakhir",
      value: fires.data ? formatNumber(fires.data.total) : null,
      note: fires.data ? `${fires.data.byProvince.length} provinsi · ${formatNumber(fires.data.highConfidence)} keyakinan tinggi` : null,
      failed: Boolean(fires.error),
    },
    {
      icon: Sprout,
      color: "bg-emerald-100 text-emerald-700",
      label: "Provinsi teratas",
      value: fires.data?.byProvince[0]?.name ?? null,
      note: fires.data?.byProvince[0] ? `${formatNumber(fires.data.byProvince[0].count)} titik api` : null,
      failed: Boolean(fires.error),
    },
    {
      icon: Activity,
      color: "bg-violet-100 text-violet-700",
      label: "Gempa M 5+ terbaru (BMKG)",
      value: quake ? `M ${quake.magnitude.toFixed(1)}` : null,
      note: quake ? `${quake.region} · ${formatRelative(quake.occurredAt)}` : null,
      failed: Boolean(quakes.error),
    },
  ]

  return (
    <section aria-label="Kondisi terkini" className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3">
      {items.map(({ icon: Icon, color, label, value, note, failed }) => (
        <div key={label} className="rounded-xl border border-white/60 bg-white/80 p-4 text-left shadow-sm backdrop-blur">
          <div className="flex items-center gap-2">
            <span className={`rounded-md p-1.5 ${color}`} aria-hidden>
              <Icon className="h-4 w-4" />
            </span>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
          </div>
          {failed ? (
            <p className="mt-2 text-sm text-muted-foreground">Tidak tersedia saat ini</p>
          ) : value === null ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-muted" aria-label="Memuat" />
          ) : (
            <>
              <p className="mt-1 truncate text-2xl font-bold tracking-tight text-emerald-950">{value}</p>
              {note && <p className="truncate text-xs text-muted-foreground">{note}</p>}
            </>
          )}
        </div>
      ))}
    </section>
  )
}
