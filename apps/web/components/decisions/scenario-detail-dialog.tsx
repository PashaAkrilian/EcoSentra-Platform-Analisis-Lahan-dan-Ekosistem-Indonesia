"use client"

import Link from "next/link"
import { useMemo } from "react"
import { CircleAlert, Info, MapPin, MessageCircle, OctagonAlert } from "lucide-react"
import { useAssistantContext } from "@/components/assistant-context"
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/components/decisions/scenario-form-dialog"
import { LocationInsights } from "@/components/map/location-insights"
import { LoadingLines } from "@/components/status"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useLocationData } from "@/hooks/use-location-data"
import type { Scenario } from "@/lib/data/types"
import { formatDate } from "@/lib/format"
import { formatLatLng, nearbyHotspots } from "@/lib/geo"
import { recommend, type Recommendation } from "@/lib/recommendations"

const LEVEL_STYLE: Record<Recommendation["level"], { icon: typeof Info; label: string; className: string }> = {
  tindakan: { icon: OctagonAlert, label: "Perlu tindakan", className: "border-red-200 bg-red-50 text-red-950" },
  perhatian: { icon: CircleAlert, label: "Perlu perhatian", className: "border-amber-200 bg-amber-50 text-amber-950" },
  info: { icon: Info, label: "Informasi", className: "border-sky-200 bg-sky-50 text-sky-950" },
}

/** Konteks data + rekomendasi aturan untuk skenario yang punya lokasi. Hook data dipanggil sekali di sini. */
function ScenarioContext({ scenario, lat, lng }: { scenario: Scenario; lat: number; lng: number }) {
  const data = useLocationData(lat, lng, 1000)
  const { ask } = useAssistantContext()
  const { landcover, ndvi, weather, hotspots } = data

  const nearby = useMemo(() => (hotspots.data ? nearbyHotspots(hotspots.data.points, { lat, lng }) : null), [hotspots.data, lat, lng])
  const recommendations = useMemo(
    () => recommend({ category: scenario.category, landcover: landcover.data, ndvi: ndvi.data, weather: weather.data, nearby }),
    [scenario.category, landcover.data, ndvi.data, weather.data, nearby],
  )
  const loading = landcover.isLoading || ndvi.isLoading || weather.isLoading || hotspots.isLoading

  const askAssistant = () =>
    ask(
      `Saya punya skenario "${scenario.title}" (kategori ${CATEGORY_LABELS[scenario.category].toLowerCase()}, prioritas ${PRIORITY_LABELS[scenario.priority].toLowerCase()}) ` +
        `di koordinat ${lat.toFixed(5)}, ${lng.toFixed(5)}. Berdasarkan data terkini di lokasi itu, apa risikonya dan langkah apa yang Anda sarankan?`,
    )

  return (
    <div className="space-y-5">
      <section aria-labelledby="reko-title">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 id="reko-title" className="text-sm font-semibold">
            Rekomendasi dari data terkini
          </h3>
          <Button size="sm" variant="outline" onClick={askAssistant}>
            <MessageCircle aria-hidden /> Tanya LandAI
          </Button>
        </div>
        {loading && recommendations.length === 0 ? (
          <LoadingLines rows={3} />
        ) : recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada rekomendasi — data lokasi belum lengkap atau tidak ada hal yang perlu disorot.</p>
        ) : (
          <ul className="space-y-2">
            {recommendations.map((r) => {
              const { icon: Icon, label, className } = LEVEL_STYLE[r.level]
              return (
                <li key={r.title} className={`rounded-lg border p-3 ${className}`}>
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {r.title}
                    <span className="ml-auto text-[11px] font-medium opacity-80">{label}</span>
                  </p>
                  <p className="mt-1 text-sm">{r.detail}</p>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Rekomendasi dihasilkan dari aturan sederhana atas data langsung (titik api 24 jam, prakiraan cuaca, NDVI, tutupan lahan radius 1 km) —
          indikatif, bukan pengganti kajian lapangan. Aturannya dijelaskan di <Link href="/help#peringatan" className="font-medium text-emerald-800 underline underline-offset-2">Bantuan</Link>.
        </p>
      </section>

      <LocationInsights lat={lat} lng={lng} bufferMeters={1000} allowDownload={false} data={data} />
    </div>
  )
}

export function ScenarioDetailDialog({ scenario, onOpenChange }: { scenario: Scenario | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={scenario !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {scenario && (
          <>
            <DialogHeader>
              <DialogTitle>{scenario.title}</DialogTitle>
              <DialogDescription>
                {CATEGORY_LABELS[scenario.category]} · {STATUS_LABELS[scenario.status]} · prioritas {PRIORITY_LABELS[scenario.priority].toLowerCase()}
              </DialogDescription>
            </DialogHeader>

            {scenario.description && <p className="whitespace-pre-wrap text-sm">{scenario.description}</p>}

            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-md bg-muted px-3 py-2">
                <dt className="text-xs text-muted-foreground">Tenggat</dt>
                <dd className="font-medium">{formatDate(scenario.deadline)}</dd>
              </div>
              <div className="rounded-md bg-muted px-3 py-2">
                <dt className="text-xs text-muted-foreground">Dibuat</dt>
                <dd className="font-medium">{formatDate(scenario.createdAt)}</dd>
              </div>
              <div className="rounded-md bg-muted px-3 py-2">
                <dt className="text-xs text-muted-foreground">Lokasi</dt>
                <dd className="flex items-center gap-1 truncate font-medium">
                  {scenario.location ? (
                    <>
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <Link href={`/maps?lat=${scenario.location.lat}&lng=${scenario.location.lng}&zoom=11&sel=1`} className="truncate hover:underline">
                        {formatLatLng(scenario.location.lat, scenario.location.lng, 3)}
                      </Link>
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>

            {scenario.location ? (
              <ScenarioContext scenario={scenario} lat={scenario.location.lat} lng={scenario.location.lng} />
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Skenario ini belum punya lokasi. Ubah skenario dan tambahkan lokasi untuk melihat rekomendasi dan kondisi terkini di sana.
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
