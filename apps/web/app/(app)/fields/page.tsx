"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar, Eye, MapPin, Microscope, Pencil, Plus, Search, Sprout, Trash2 } from "lucide-react"
import { FieldDetailDialog } from "@/components/fields/field-detail-dialog"
import { FieldFormDialog } from "@/components/fields/field-form-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageContainer, PageHeader } from "@/components/page-header"
import { RequireAuth } from "@/components/require-auth"
import { EmptyState, ErrorState, LoadingLines } from "@/components/status"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApi, useAuthedFetch } from "@/hooks/use-api"
import type { Field, LandCoverSnapshot, LatLng } from "@/lib/data/types"
import { formatDate, formatNumber, formatRelative } from "@/lib/format"
import { formatLatLng } from "@/lib/geo"
import { CROP_TYPES } from "@/lib/schemas"

function FieldsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authedFetch = useAuthedFetch()
  const fields = useApi<Field[]>("/api/fields", { auth: true })

  const [query, setQuery] = useState("")
  const [crop, setCrop] = useState("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Field | null>(null)
  const [prefill, setPrefill] = useState<LatLng | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Field | null>(null)

  // ?add=1&lat=..&lng=.. (dari tombol "Simpan sebagai lahan saya" di peta) membuka form tambah.
  useEffect(() => {
    if (searchParams.get("add") !== "1") return
    const lat = Number(searchParams.get("lat"))
    const lng = Number(searchParams.get("lng"))
    setPrefill(searchParams.has("lat") && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null)
    setEditing(null)
    setFormOpen(true)
    router.replace("/fields", { scroll: false })
  }, [searchParams, router])

  const list = useMemo(() => fields.data ?? [], [fields.data])
  const detail = list.find((f) => f.id === detailId) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list.filter(
      (f) => (crop === "all" || f.cropType === crop) && (!q || `${f.name} ${f.cropType} ${f.notes}`.toLowerCase().includes(q)),
    )
  }, [list, query, crop])

  const upsert = (saved: Field) =>
    fields.setData((prev) => {
      const current = prev ?? []
      return current.some((f) => f.id === saved.id) ? current.map((f) => (f.id === saved.id ? saved : f)) : [saved, ...current]
    })

  const markAnalyzed = (fieldId: string, snapshot: LandCoverSnapshot) =>
    fields.setData(
      (prev) =>
        prev &&
        prev.map((f) =>
          f.id === fieldId
            ? {
                ...f,
                lastAnalysis: {
                  dominantClass: snapshot.dominantClass,
                  dataset: `${snapshot.dataset} (${snapshot.year})`,
                  analyzedAt: snapshot.createdAt ?? new Date().toISOString(),
                },
              }
            : f,
        ),
    )

  const remove = async (field: Field) => {
    await authedFetch(`/api/fields/${field.id}`, { method: "DELETE" })
    fields.setData((prev) => prev && prev.filter((f) => f.id !== field.id))
  }

  const openCreate = () => {
    setEditing(null)
    setPrefill(null)
    setFormOpen(true)
  }

  const totalHa = list.reduce((sum, f) => sum + f.areaHa, 0)

  return (
    <>
      <PageHeader
        title="Lahan Saya"
        description={
          list.length > 0
            ? `${formatNumber(list.length)} lahan · ${formatNumber(totalHa, 1)} ha total. Data hanya terlihat oleh Anda.`
            : "Simpan lokasi kebun atau sawah untuk memantau tutupan lahan, vegetasi, cuaca, dan titik api di sekitarnya."
        }
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden /> Tambah lahan
          </Button>
        }
      />

      {fields.isLoading ? (
        <Card>
          <CardContent className="p-6">
            <LoadingLines rows={4} />
          </CardContent>
        </Card>
      ) : fields.error ? (
        <ErrorState message={fields.error} onRetry={fields.reload} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="Belum ada lahan"
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden /> Tambah lahan pertama
            </Button>
          }
        >
          Anda juga bisa memilih titik di <a href="/maps" className="font-medium text-emerald-800 underline underline-offset-2">peta</a> lalu menekan “Simpan sebagai lahan saya”.
        </EmptyState>
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_14rem]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input placeholder="Cari nama atau catatan…" aria-label="Cari lahan" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <Select value={crop} onValueChange={setCrop}>
                <SelectTrigger aria-label="Filter jenis tanaman">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua jenis tanaman</SelectItem>
                  {CROP_TYPES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {filtered.length === 0 ? (
            <EmptyState icon={Search} title="Tidak ada lahan yang cocok">
              Ubah kata kunci atau filter jenis tanaman.
            </EmptyState>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((field) => (
                <li key={field.id}>
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col gap-4 p-5">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="text-base font-semibold leading-snug">{field.name}</h2>
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">{field.cropType}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{formatNumber(field.areaHa, 2)} hektare</p>
                      </div>

                      <dl className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <dt className="sr-only">Koordinat</dt>
                          <dd className="tabular-nums">{formatLatLng(field.location.lat, field.location.lng)}</dd>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <dt className="sr-only">Tanggal tanam</dt>
                          <dd>{field.plantingDate ? `Tanam ${formatDate(field.plantingDate)}` : "Tanggal tanam belum diisi"}</dd>
                        </div>
                        <div className="flex items-start gap-2">
                          <Microscope className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <dt className="sr-only">Analisis terakhir</dt>
                          <dd>
                            {field.lastAnalysis ? (
                              <>
                                {field.lastAnalysis.dominantClass}{" "}
                                <span className="text-muted-foreground">
                                  · {field.lastAnalysis.dataset} · {formatRelative(field.lastAnalysis.analyzedAt)}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">Belum dianalisis</span>
                            )}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-auto flex gap-2">
                        <Button className="flex-1" variant="outline" size="sm" onClick={() => setDetailId(field.id)}>
                          <Eye aria-hidden /> Detail
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => {
                            setEditing(field)
                            setFormOpen(true)
                          }}
                          title="Ubah"
                        >
                          <Pencil aria-hidden />
                          <span className="sr-only">Ubah {field.name}</span>
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setDeleting(field)} title="Hapus">
                          <Trash2 className="text-red-700" aria-hidden />
                          <span className="sr-only">Hapus {field.name}</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <FieldFormDialog open={formOpen} onOpenChange={setFormOpen} field={editing} prefill={prefill} onSaved={upsert} />
      <FieldDetailDialog field={detail} onOpenChange={(open) => !open && setDetailId(null)} onAnalyzed={markAnalyzed} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Hapus lahan?"
        description={`“${deleting?.name ?? ""}” beserta seluruh riwayat analisisnya akan dihapus permanen.`}
        onConfirm={() => remove(deleting!)}
      />
    </>
  )
}

export default function FieldsPage() {
  return (
    <PageContainer>
      <RequireAuth feature="Data lahan" title="Lahan Saya">
        <Suspense fallback={<LoadingLines rows={4} />}>
          <FieldsContent />
        </Suspense>
      </RequireAuth>
    </PageContainer>
  )
}
