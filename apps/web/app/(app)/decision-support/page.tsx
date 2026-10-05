"use client"

import { useMemo, useState } from "react"
import { CalendarClock, Eye, MapPin, Pencil, Plus, Search, Target, Trash2 } from "lucide-react"
import { CATEGORY_LABELS, PRIORITY_LABELS, ScenarioFormDialog, STATUS_LABELS } from "@/components/decisions/scenario-form-dialog"
import { ScenarioDetailDialog } from "@/components/decisions/scenario-detail-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageContainer, PageHeader } from "@/components/page-header"
import { RequireAuth } from "@/components/require-auth"
import { EmptyState, ErrorState, LoadingLines } from "@/components/status"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApi, useAuthedFetch } from "@/hooks/use-api"
import type { Scenario } from "@/lib/data/types"
import { formatDate, formatNumber } from "@/lib/format"
import { SCENARIO_CATEGORIES, SCENARIO_STATUSES } from "@/lib/schemas"

const STATUS_STYLE: Record<Scenario["status"], string> = {
  draf: "bg-slate-100 text-slate-800",
  berjalan: "bg-emerald-100 text-emerald-900",
  selesai: "bg-sky-100 text-sky-900",
}
const PRIORITY_STYLE: Record<Scenario["priority"], string> = {
  rendah: "bg-slate-100 text-slate-700",
  sedang: "bg-amber-100 text-amber-900",
  tinggi: "bg-red-100 text-red-900",
}

function isOverdue(scenario: Scenario, today = new Date().toISOString().slice(0, 10)) {
  return scenario.status !== "selesai" && scenario.deadline !== null && scenario.deadline < today
}

function DecisionsContent() {
  const authedFetch = useAuthedFetch()
  const scenarios = useApi<Scenario[]>("/api/decisions", { auth: true })

  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [category, setCategory] = useState("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Scenario | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Scenario | null>(null)

  const list = useMemo(() => scenarios.data ?? [], [scenarios.data])
  const detail = list.find((s) => s.id === detailId) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list.filter(
      (s) =>
        (status === "all" || s.status === status) &&
        (category === "all" || s.category === category) &&
        (!q || `${s.title} ${s.description}`.toLowerCase().includes(q)),
    )
  }, [list, query, status, category])

  const upsert = (saved: Scenario) =>
    scenarios.setData((prev) => {
      const current = prev ?? []
      return current.some((s) => s.id === saved.id) ? current.map((s) => (s.id === saved.id ? saved : s)) : [saved, ...current]
    })

  const remove = async (scenario: Scenario) => {
    await authedFetch(`/api/decisions/${scenario.id}`, { method: "DELETE" })
    scenarios.setData((prev) => prev && prev.filter((s) => s.id !== scenario.id))
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const count = (s: Scenario["status"]) => list.filter((x) => x.status === s).length

  return (
    <>
      <PageHeader
        title="Pendukung Keputusan"
        description="Catat skenario pengelolaan lahan Anda. Skenario yang punya lokasi menampilkan kondisi terkini di sana — titik api, cuaca, NDVI, tutupan lahan — beserta rekomendasi indikatif."
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden /> Buat skenario
          </Button>
        }
      />

      {scenarios.isLoading ? (
        <Card>
          <CardContent className="p-6">
            <LoadingLines rows={4} />
          </CardContent>
        </Card>
      ) : scenarios.error ? (
        <ErrorState message={scenarios.error} onRetry={scenarios.reload} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Belum ada skenario"
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden /> Buat skenario pertama
            </Button>
          }
        >
          Contoh: “Pencegahan karhutla musim kemarau”, “Rotasi padi–palawija”, atau “Restorasi mangrove pesisir”.
        </EmptyState>
      ) : (
        <>
          <section aria-label="Ringkasan status" className="mb-6 grid grid-cols-3 gap-3">
            {SCENARIO_STATUSES.map((s) => (
              <Card key={s}>
                <CardContent className="flex items-center justify-between p-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[s]}`}>{STATUS_LABELS[s]}</span>
                  <span className="text-2xl font-bold tabular-nums">{formatNumber(count(s))}</span>
                </CardContent>
              </Card>
            ))}
          </section>

          <Card className="mb-6">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_11rem_11rem]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input placeholder="Cari judul atau deskripsi…" aria-label="Cari skenario" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger aria-label="Filter status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  {SCENARIO_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger aria-label="Filter kategori">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua kategori</SelectItem>
                  {SCENARIO_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {filtered.length === 0 ? (
            <EmptyState icon={Search} title="Tidak ada skenario yang cocok">
              Ubah kata kunci atau filter.
            </EmptyState>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((scenario) => (
                <li key={scenario.id}>
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col gap-3 p-5">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[scenario.status]}`}>{STATUS_LABELS[scenario.status]}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[scenario.priority]}`}>Prioritas {PRIORITY_LABELS[scenario.priority].toLowerCase()}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{CATEGORY_LABELS[scenario.category]}</span>
                      </div>
                      <h2 className="text-base font-semibold leading-snug">{scenario.title}</h2>
                      {scenario.description && <p className="line-clamp-3 text-sm text-muted-foreground">{scenario.description}</p>}
                      <div className="space-y-1 text-sm">
                        {scenario.deadline && (
                          <p className={`flex items-center gap-1.5 ${isOverdue(scenario) ? "font-medium text-red-700" : "text-muted-foreground"}`}>
                            <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
                            {isOverdue(scenario) ? "Lewat tenggat · " : "Tenggat "}
                            {formatDate(scenario.deadline)}
                          </p>
                        )}
                        {scenario.location && (
                          <p className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0" aria-hidden /> Punya lokasi — konteks data tersedia
                          </p>
                        )}
                      </div>
                      <div className="mt-auto flex gap-2 pt-1">
                        <Button className="flex-1" variant="outline" size="sm" onClick={() => setDetailId(scenario.id)}>
                          <Eye aria-hidden /> Detail
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          title="Ubah"
                          onClick={() => {
                            setEditing(scenario)
                            setFormOpen(true)
                          }}
                        >
                          <Pencil aria-hidden />
                          <span className="sr-only">Ubah {scenario.title}</span>
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9" title="Hapus" onClick={() => setDeleting(scenario)}>
                          <Trash2 className="text-red-700" aria-hidden />
                          <span className="sr-only">Hapus {scenario.title}</span>
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

      <ScenarioFormDialog open={formOpen} onOpenChange={setFormOpen} scenario={editing} onSaved={upsert} />
      <ScenarioDetailDialog scenario={detail} onOpenChange={(open) => !open && setDetailId(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Hapus skenario?"
        description={`“${deleting?.title ?? ""}” akan dihapus permanen.`}
        onConfirm={() => remove(deleting!)}
      />
    </>
  )
}

export default function DecisionSupportPage() {
  return (
    <PageContainer>
      <RequireAuth feature="Skenario keputusan" title="Pendukung Keputusan">
        <DecisionsContent />
      </RequireAuth>
    </PageContainer>
  )
}
