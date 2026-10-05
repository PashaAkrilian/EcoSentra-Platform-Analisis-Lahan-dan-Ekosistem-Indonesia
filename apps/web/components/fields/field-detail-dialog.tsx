"use client"

import Link from "next/link"
import { useState } from "react"
import { History, LoaderCircle, MapPin, Microscope } from "lucide-react"
import { LandCoverBreakdown } from "@/components/map/land-cover-breakdown"
import { LocationInsights } from "@/components/map/location-insights"
import { EmptyState, ErrorState, LoadingLines } from "@/components/status"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useApi, useAuthedFetch } from "@/hooks/use-api"
import { errorMessage } from "@/lib/api-client"
import type { Field, LandCoverSnapshot } from "@/lib/data/types"
import { formatDate, formatDateTime, formatNumber } from "@/lib/format"
import { bufferForArea, formatLatLng } from "@/lib/geo"

/** Detail lahan: info, analisis tutupan lahan tersimpan (riwayat), dan kondisi terkini (data langsung). */
export function FieldDetailDialog({
  field,
  onOpenChange,
  onAnalyzed,
}: {
  field: Field | null
  onOpenChange: (open: boolean) => void
  onAnalyzed: (fieldId: string, snapshot: LandCoverSnapshot) => void
}) {
  const authedFetch = useAuthedFetch()
  const snapshots = useApi<LandCoverSnapshot[]>(field ? `/api/landCoverSnapshots?fieldId=${field.id}` : null, { auth: true })
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [tab, setTab] = useState("riwayat")

  const analyze = async () => {
    if (!field) return
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const snapshot = await authedFetch<LandCoverSnapshot>(`/api/fields/${field.id}/analyze`, { method: "POST" })
      snapshots.setData((prev) => [snapshot, ...(prev ?? [])])
      onAnalyzed(field.id, snapshot)
    } catch (error) {
      setAnalyzeError(errorMessage(error))
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <Dialog open={field !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {field && (
          <>
            <DialogHeader>
              <DialogTitle>{field.name}</DialogTitle>
              <DialogDescription>
                {field.cropType} · {formatNumber(field.areaHa, 2)} ha · {formatLatLng(field.location.lat, field.location.lng)}
              </DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-md bg-muted px-3 py-2">
                <dt className="text-xs text-muted-foreground">Tanggal tanam</dt>
                <dd className="font-medium">{formatDate(field.plantingDate)}</dd>
              </div>
              <div className="rounded-md bg-muted px-3 py-2">
                <dt className="text-xs text-muted-foreground">Dibuat</dt>
                <dd className="font-medium">{formatDate(field.createdAt)}</dd>
              </div>
              <div className="rounded-md bg-muted px-3 py-2 sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Catatan</dt>
                <dd className="truncate font-medium">{field.notes || "—"}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button onClick={analyze} disabled={analyzing}>
                {analyzing ? <LoaderCircle className="animate-spin" aria-hidden /> : <Microscope aria-hidden />}
                Analisis tutupan lahan
              </Button>
              <Button asChild variant="outline">
                <Link href={`/maps?lat=${field.location.lat}&lng=${field.location.lng}&zoom=13&sel=1`}>
                  <MapPin aria-hidden /> Buka di peta
                </Link>
              </Button>
            </div>
            {analyzeError && <ErrorState message={analyzeError} />}

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="riwayat">
                  <History className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Riwayat analisis
                </TabsTrigger>
                <TabsTrigger value="kondisi">Kondisi terkini</TabsTrigger>
              </TabsList>

              <TabsContent value="riwayat" className="mt-4">
                {snapshots.isLoading ? (
                  <LoadingLines rows={3} />
                ) : snapshots.error ? (
                  <ErrorState message={snapshots.error} onRetry={snapshots.reload} />
                ) : (snapshots.data ?? []).length === 0 ? (
                  <EmptyState icon={History} title="Belum ada analisis">
                    Tekan <strong>Analisis tutupan lahan</strong> untuk menyimpan komposisi tutupan lahan di sekitar lokasi ini.
                    Ulangi berkala untuk melihat perubahannya.
                  </EmptyState>
                ) : (
                  <ul className="space-y-4">
                    {snapshots.data!.map((snapshot) => (
                      <li key={snapshot.id} className="rounded-lg border p-4">
                        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold">
                            Dominan: {snapshot.dominantClass}{" "}
                            <span className="font-normal text-muted-foreground">({formatNumber(snapshot.classes[0]?.percentage ?? 0, 1)}%)</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(snapshot.createdAt)} · {snapshot.dataset} {snapshot.year} · radius {formatNumber(snapshot.bufferMeters)} m
                          </p>
                        </div>
                        <LandCoverBreakdown classes={snapshot.classes} ariaLabel={`Komposisi tutupan lahan ${formatDate(snapshot.createdAt)}`} />
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="kondisi" className="mt-4">
                {tab === "kondisi" && (
                  <LocationInsights
                    lat={field.location.lat}
                    lng={field.location.lng}
                    bufferMeters={bufferForArea(field.areaHa)}
                  />
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
