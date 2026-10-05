"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Activity, Bell, Flame, MapPin, Plus, RefreshCw, Search, Trash2, TriangleAlert, Waves } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { AlertFormDialog } from "@/components/alerts/alert-form-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageContainer, PageHeader } from "@/components/page-header"
import { EmptyState, ErrorState, LoadingLines, SeverityBadge, SourceNote } from "@/components/status"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApi, useAuthedFetch } from "@/hooks/use-api"
import {
  adminAlerts,
  fireAlerts,
  mapLink,
  quakeAlerts,
  SEVERITY_ORDER,
  sortAlerts,
  type DerivedAlert,
} from "@/lib/alerts"
import { errorMessage } from "@/lib/api-client"
import type { Alert, EarthquakesResponse, HotspotSummary, UserProfile } from "@/lib/data/types"
import { formatDateTime, formatNumber, formatRelative } from "@/lib/format"

const KIND_META: Record<Alert["type"], { label: string; icon: typeof Flame }> = {
  kebakaran: { label: "Kebakaran", icon: Flame },
  gempa: { label: "Gempa bumi", icon: Activity },
  banjir: { label: "Banjir", icon: Waves },
  kekeringan: { label: "Kekeringan", icon: TriangleAlert },
  longsor: { label: "Tanah longsor", icon: TriangleAlert },
  lainnya: { label: "Lainnya", icon: Bell },
}

const SEVERITY_LABELS: Record<Alert["severity"], string> = { kritis: "Kritis", tinggi: "Tinggi", sedang: "Sedang", rendah: "Rendah" }
const STATUS_LABELS: Record<Alert["status"], string> = { aktif: "Aktif", dipantau: "Dipantau", selesai: "Selesai" }

function AlertCard({ alert }: { alert: DerivedAlert }) {
  const { icon: Icon, label } = KIND_META[alert.kind]
  return (
    <Card>
      <CardContent className="flex gap-4 p-5">
        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted sm:flex" aria-hidden>
          <Icon className="h-5 w-5 text-emerald-800" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={alert.severity} />
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{label}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{STATUS_LABELS[alert.status]}</span>
            <span className="ml-auto text-xs text-muted-foreground" title={formatDateTime(alert.occurredAt)}>
              {formatRelative(alert.occurredAt)}
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold leading-snug">{alert.title}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{alert.regionName}</span>
          </p>
          {alert.description && <p className="mt-2 text-sm text-foreground/80">{alert.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button asChild size="sm" variant="outline">
              <Link href={mapLink(alert.location, alert.kind)}>
                <MapPin aria-hidden /> Lihat di peta
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">Sumber: {alert.source}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DisasterAlertsPage() {
  const { user } = useAuth()
  const authedFetch = useAuthedFetch()
  const fires = useApi<HotspotSummary>("/api/hotspots/summary?range=24h")
  const quakes = useApi<EarthquakesResponse>("/api/earthquakes")
  const curated = useApi<{ configured: boolean; alerts: Alert[] }>("/api/alerts")
  const profile = useApi<UserProfile>(user ? "/api/profile" : null, { auth: true })
  const isAdmin = profile.data?.isAdmin === true

  const [query, setQuery] = useState("")
  const [kind, setKind] = useState("all")
  const [severity, setSeverity] = useState("all")
  const [status, setStatus] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<Alert | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)

  const alerts = useMemo(() => {
    const all = [
      ...(fires.data ? fireAlerts(fires.data) : []),
      ...(quakes.data ? quakeAlerts([...quakes.data.recent, ...quakes.data.felt]) : []),
      ...(curated.data ? adminAlerts(curated.data.alerts) : []),
    ]
    return sortAlerts(all.filter((a) => a.status !== "selesai" || status === "selesai" || status === "all"))
  }, [fires.data, quakes.data, curated.data, status])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return alerts.filter(
      (a) =>
        (kind === "all" || a.kind === kind) &&
        (severity === "all" || a.severity === severity) &&
        (status === "all" || a.status === status) &&
        (!q || `${a.title} ${a.regionName} ${a.description}`.toLowerCase().includes(q)),
    )
  }, [alerts, kind, severity, status, query])

  const countBy = (s: Alert["severity"]) => alerts.filter((a) => a.severity === s).length
  const isLoading = fires.isLoading || quakes.isLoading || curated.isLoading
  const allFailed = Boolean(fires.error && quakes.error)

  const reloadAll = () => {
    fires.reload()
    quakes.reload()
    curated.reload()
  }

  const updateStatus = async (alert: Alert, next: Alert["status"]) => {
    setAdminError(null)
    try {
      const updated = await authedFetch<Alert>(`/api/alerts/${alert.id}`, { method: "PATCH", body: { status: next } })
      curated.setData((prev) => prev && { ...prev, alerts: prev.alerts.map((a) => (a.id === updated.id ? updated : a)) })
    } catch (error) {
      setAdminError(errorMessage(error))
    }
  }

  const remove = async (alert: Alert) => {
    await authedFetch(`/api/alerts/${alert.id}`, { method: "DELETE" })
    curated.setData((prev) => prev && { ...prev, alerts: prev.alerts.filter((a) => a.id !== alert.id) })
  }

  return (
    <PageContainer>
      <PageHeader
        title="Peringatan Bencana"
        description="Peringatan otomatis dari gempa BMKG dan klaster titik api NASA FIRMS, ditambah peringatan kurasi admin. Ini bukan pengganti peringatan resmi BMKG/BNPB."
        actions={
          <>
            <Button variant="outline" onClick={reloadAll} disabled={isLoading}>
              <RefreshCw className={isLoading ? "animate-spin" : ""} aria-hidden /> Muat ulang
            </Button>
            {isAdmin && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus aria-hidden /> Buat peringatan
              </Button>
            )}
          </>
        }
      />

      <section aria-label="Ringkasan tingkat keparahan" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SEVERITY_ORDER.map((s) => (
          <Card key={s}>
            <CardContent className="flex items-center justify-between p-4">
              <SeverityBadge severity={s} />
              <span className="text-2xl font-bold tabular-nums">{isLoading ? "–" : formatNumber(countBy(s))}</span>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="mt-6">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              placeholder="Cari judul atau wilayah…"
              aria-label="Cari peringatan"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger aria-label="Filter jenis">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua jenis</SelectItem>
              {(Object.keys(KIND_META) as Alert["type"][]).map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_META[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger aria-label="Filter tingkat keparahan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua tingkat</SelectItem>
              {SEVERITY_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {SEVERITY_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="aktif">Aktif</SelectItem>
              <SelectItem value="dipantau">Dipantau</SelectItem>
              <SelectItem value="selesai">Selesai (kurasi admin)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-4" aria-live="polite">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <LoadingLines rows={5} />
            </CardContent>
          </Card>
        ) : allFailed ? (
          <ErrorState message={fires.error ?? "Gagal memuat data."} onRetry={reloadAll} />
        ) : (
          <>
            {(fires.error || quakes.error) && (
              <ErrorState
                message={`${fires.error ? "Titik api" : "Gempa bumi"} tidak dapat dimuat: ${fires.error ?? quakes.error}`}
                onRetry={fires.error ? fires.reload : quakes.reload}
              />
            )}
            {filtered.length === 0 ? (
              <EmptyState icon={Bell} title="Tidak ada peringatan">
                {alerts.length === 0
                  ? "Tidak ada peringatan aktif saat ini — kabar baik."
                  : "Tidak ada peringatan yang cocok dengan filter Anda. Coba ubah atau hapus filter."}
              </EmptyState>
            ) : (
              filtered.map((alert) => <AlertCard key={alert.id} alert={alert} />)
            )}
          </>
        )}
      </div>

      <div className="mt-4 space-y-1">
        {fires.data && <SourceNote name="NASA FIRMS" url="https://firms.modaps.eosdis.nasa.gov/active_fire/" fetchedAt={fires.data.source.fetchedAt} />}
        {quakes.data && <SourceNote name="BMKG" url="https://data.bmkg.go.id/gempabumi/" fetchedAt={quakes.data.source.fetchedAt} />}
        <p className="text-xs text-muted-foreground">
          Ambang peringatan otomatis dijelaskan di <Link href="/help#peringatan" className="font-medium text-emerald-800 underline underline-offset-2">Bantuan & Metodologi</Link>.
        </p>
      </div>

      {isAdmin && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Kelola peringatan kurasi</CardTitle>
            <CardDescription>Hanya terlihat oleh admin. Ubah status atau hapus peringatan yang sudah diterbitkan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {adminError && <p className="text-sm text-red-700">{adminError}</p>}
            {(curated.data?.alerts ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada peringatan kurasi.</p>
            ) : (
              <ul className="divide-y">
                {curated.data!.alerts.map((alert) => (
                  <li key={alert.id} className="flex flex-wrap items-center gap-3 py-3">
                    <SeverityBadge severity={alert.severity} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{alert.title}</span>
                    <Select value={alert.status} onValueChange={(v) => updateStatus(alert, v as Alert["status"])}>
                      <SelectTrigger className="w-36" aria-label={`Status ${alert.title}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABELS) as Alert["status"][]).map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(alert)} title="Hapus peringatan">
                      <Trash2 className="text-red-700" aria-hidden />
                      <span className="sr-only">Hapus {alert.title}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <AlertFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(alert) => curated.setData((prev) => ({ configured: true, alerts: [alert, ...(prev?.alerts ?? [])] }))}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Hapus peringatan?"
        description={`“${deleting?.title ?? ""}” akan dihapus permanen dan hilang dari tampilan semua pengunjung.`}
        onConfirm={() => remove(deleting!)}
      />
    </PageContainer>
  )
}
