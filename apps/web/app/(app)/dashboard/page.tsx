"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Activity, ArrowRight, Flame, LogIn, MapPin, Sprout, TriangleAlert } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { BarList } from "@/components/charts/bar-list"
import { ChartTable, ENTITY_COLORS } from "@/components/charts/chart-utils"
import { ColumnChart, type ColumnDatum } from "@/components/charts/column-chart"
import { Sparkline } from "@/components/charts/sparkline"
import { PageContainer, PageHeader } from "@/components/page-header"
import { EmptyState, ErrorState, LoadingLines, SeverityBadge, SourceNote, StatTile } from "@/components/status"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useApi } from "@/hooks/use-api"
import { adminAlerts, fireAlerts, mapLink, quakeAlerts, sortAlerts } from "@/lib/alerts"
import type { Alert, EarthquakesResponse, Field, HotspotSummary } from "@/lib/data/types"
import { formatDate, formatDateTime, formatNumber, formatRelative } from "@/lib/format"

function shortDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })
}

export default function DashboardPage() {
  const { configured, user } = useAuth()
  const fires24h = useApi<HotspotSummary>("/api/hotspots/summary?range=24h")
  const fires7d = useApi<HotspotSummary>("/api/hotspots/summary?range=7d")
  const quakes = useApi<EarthquakesResponse>("/api/earthquakes")
  const curated = useApi<{ configured: boolean; alerts: Alert[] }>("/api/alerts")
  const fields = useApi<Field[]>(user ? "/api/fields" : null, { auth: true })

  const alerts = useMemo(() => {
    const derived = [
      ...(fires24h.data ? fireAlerts(fires24h.data) : []),
      ...(quakes.data ? quakeAlerts([...quakes.data.recent, ...quakes.data.felt]) : []),
      ...(curated.data ? adminAlerts(curated.data.alerts.filter((a) => a.status !== "selesai")) : []),
    ]
    return sortAlerts(derived.filter((a) => a.status !== "selesai"))
  }, [fires24h.data, quakes.data, curated.data])

  const dailyData: ColumnDatum[] = useMemo(() => {
    const days = fires7d.data?.byDay ?? []
    return days.map((d, i) => {
      // Rentang 7 hari bergulir: hari pertama & terakhir belum lengkap.
      const partial = days.length >= 3 && (i === 0 || i === days.length - 1)
      return {
        key: d.date,
        label: shortDay(d.date),
        fullLabel: `${formatDate(d.date)}${partial ? " (sebagian hari)" : ""}`,
        value: d.count,
        partial,
      }
    })
  }, [fires7d.data])
  const completeDays = dailyData.filter((d) => !d.partial).map((d) => d.value)

  const topProvinces = (fires24h.data?.byProvince ?? []).slice(0, 8)
  const latestQuake = quakes.data?.recent[0] ?? quakes.data?.latest ?? null
  const urgentAlerts = alerts.filter((a) => a.severity === "kritis" || a.severity === "tinggi").length
  const quakeList = quakes.data?.recent.slice(0, 5) ?? []

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Kondisi terkini lahan dan ekosistem Indonesia dari data satelit dan lembaga resmi — diambil langsung saat halaman dibuka."
        actions={
          <Button asChild>
            <Link href="/maps">
              <MapPin aria-hidden /> Buka peta
            </Link>
          </Button>
        }
      />

      {/* Ringkasan utama */}
      <section aria-label="Ringkasan" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Titik api (24 jam)"
          icon={Flame}
          accent="bg-orange-100 text-orange-700"
          isLoading={fires24h.isLoading}
          error={fires24h.error}
          onRetry={fires24h.reload}
          value={fires24h.data ? formatNumber(fires24h.data.total) : undefined}
          note={fires24h.data ? `${formatNumber(fires24h.data.highConfidence)} berkeyakinan tinggi` : undefined}
          trend={
            completeDays.length > 1 ? (
              <Sparkline values={completeDays} accent={ENTITY_COLORS.fire} label="Tren titik api harian, hari lengkap" />
            ) : undefined
          }
        />
        <StatTile
          label="Provinsi dengan titik api"
          icon={Sprout}
          accent="bg-emerald-100 text-emerald-700"
          isLoading={fires24h.isLoading}
          error={fires24h.error}
          onRetry={fires24h.reload}
          value={fires24h.data ? `${fires24h.data.byProvince.length} / 34` : undefined}
          note={topProvinces[0] ? `Terbanyak: ${topProvinces[0].name}` : "Tidak ada titik api terdeteksi"}
        />
        <StatTile
          label="Gempa M 5+ terbaru"
          icon={Activity}
          accent="bg-violet-100 text-violet-700"
          isLoading={quakes.isLoading}
          error={quakes.error}
          onRetry={quakes.reload}
          value={latestQuake ? `M ${latestQuake.magnitude.toFixed(1)}` : "—"}
          note={latestQuake ? `${latestQuake.region} · ${formatRelative(latestQuake.occurredAt)}` : undefined}
        />
        <StatTile
          label="Peringatan aktif"
          icon={TriangleAlert}
          accent="bg-red-100 text-red-700"
          isLoading={fires24h.isLoading || quakes.isLoading}
          error={fires24h.error && quakes.error ? "gagal" : null}
          onRetry={() => {
            fires24h.reload()
            quakes.reload()
          }}
          value={formatNumber(alerts.length)}
          note={`${formatNumber(urgentAlerts)} tingkat tinggi/kritis`}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Tren harian */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Titik api per hari — 7 hari terakhir</CardTitle>
            <CardDescription>
              Jumlah titik api VIIRS di daratan Indonesia per hari kalender WIB. Kolom pucat = hari yang belum lengkap.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fires7d.isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : fires7d.error ? (
              <ErrorState message={fires7d.error} onRetry={fires7d.reload} />
            ) : (
              <>
                <ColumnChart
                  data={dailyData}
                  color={ENTITY_COLORS.fire}
                  ariaLabel="Grafik kolom jumlah titik api per hari selama 7 hari terakhir"
                  unit="titik api"
                />
                <ChartTable
                  caption="Jumlah titik api per hari"
                  columns={["Tanggal (WIB)", "Titik api"]}
                  rows={dailyData.map((d) => [d.fullLabel ?? d.label, d.value])}
                />
                {fires7d.data && (
                  <SourceNote
                    className="mt-3"
                    name="NASA FIRMS"
                    url="https://firms.modaps.eosdis.nasa.gov/active_fire/"
                    fetchedAt={fires7d.data.source.fetchedAt}
                    extra={fires7d.data.source.satellite}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Peringatan teratas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Peringatan teratas</CardTitle>
            <CardDescription>Gabungan gempa BMKG, klaster titik api, dan peringatan admin.</CardDescription>
          </CardHeader>
          <CardContent>
            {fires24h.isLoading && quakes.isLoading ? (
              <LoadingLines rows={5} />
            ) : alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada peringatan aktif saat ini.</p>
            ) : (
              <ul className="divide-y">
                {alerts.slice(0, 4).map((alert) => (
                  <li key={alert.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <SeverityBadge severity={alert.severity} />
                      <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(alert.occurredAt)}</span>
                    </div>
                    <Link
                      href={mapLink(alert.location, alert.kind)}
                      className="mt-1.5 block text-sm font-medium leading-snug text-foreground hover:text-emerald-800 hover:underline"
                    >
                      {alert.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">{alert.source}</p>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2 text-emerald-800">
              <Link href="/disaster-alerts">
                Semua peringatan <ArrowRight aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Provinsi */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Provinsi dengan titik api terbanyak</CardTitle>
            <CardDescription>24 jam terakhir. Arahkan kursor ke bar untuk melihat jumlah keyakinan tinggi.</CardDescription>
          </CardHeader>
          <CardContent>
            {fires24h.isLoading ? (
              <LoadingLines rows={6} />
            ) : fires24h.error ? (
              <ErrorState message={fires24h.error} onRetry={fires24h.reload} />
            ) : topProvinces.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada titik api terdeteksi dalam 24 jam terakhir.</p>
            ) : (
              <BarList
                ariaLabel="Jumlah titik api per provinsi, 24 jam terakhir"
                color={ENTITY_COLORS.fire}
                items={topProvinces.map((p) => ({
                  key: p.iso,
                  label: p.name,
                  value: p.count,
                  detail: (
                    <>
                      <strong>{formatNumber(p.highConfidence)}</strong> berkeyakinan tinggi · {p.island}
                    </>
                  ),
                }))}
              />
            )}
          </CardContent>
        </Card>

        {/* Gempa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gempa bumi terkini (M 5.0+)</CardTitle>
            <CardDescription>Data BMKG, diperbarui otomatis.</CardDescription>
          </CardHeader>
          <CardContent>
            {quakes.isLoading ? (
              <LoadingLines rows={5} />
            ) : quakes.error ? (
              <ErrorState message={quakes.error} onRetry={quakes.reload} />
            ) : (
              <>
                <ul className="divide-y">
                  {quakeList.map((quake) => (
                    <li key={quake.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div
                        className="flex h-10 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-violet-100 text-violet-900"
                        aria-label={`Magnitudo ${quake.magnitude.toFixed(1)}`}
                      >
                        <span className="text-[10px] font-medium leading-none">M</span>
                        <span className="text-base font-bold leading-tight">{quake.magnitude.toFixed(1)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={mapLink({ lat: quake.lat, lng: quake.lng }, "gempa")}
                          className="block truncate text-sm font-medium hover:text-emerald-800 hover:underline"
                        >
                          {quake.region}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(quake.occurredAt)} · kedalaman {quake.depthKm} km
                        </p>
                      </div>
                      {quake.tsunamiPotential && (
                        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-900">
                          Potensi tsunami
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {quakes.data && (
                  <SourceNote
                    className="mt-3"
                    name="BMKG"
                    url="https://data.bmkg.go.id/gempabumi/"
                    fetchedAt={quakes.data.source.fetchedAt}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lahan saya */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Lahan saya</CardTitle>
          <CardDescription>Pantau lahan Anda sendiri: tutupan lahan, NDVI, cuaca, dan titik api di sekitarnya.</CardDescription>
        </CardHeader>
        <CardContent>
          {!configured ? (
            <EmptyState icon={MapPin} title="Penyimpanan lahan belum aktif">
              Instalasi ini berjalan dalam mode demo tanpa login. Semua data publik di atas tetap tersedia penuh.
            </EmptyState>
          ) : !user ? (
            <EmptyState
              icon={LogIn}
              title="Masuk untuk memantau lahan Anda"
              action={
                <Button asChild>
                  <Link href="/login">Masuk / Daftar</Link>
                </Button>
              }
            >
              Simpan lokasi kebun atau sawah, lalu lihat analisis tutupan lahan dan kondisi vegetasinya.
            </EmptyState>
          ) : fields.isLoading ? (
            <LoadingLines rows={2} />
          ) : fields.error ? (
            <ErrorState message={fields.error} onRetry={fields.reload} />
          ) : (fields.data ?? []).length === 0 ? (
            <EmptyState
              icon={Sprout}
              title="Belum ada lahan"
              action={
                <Button asChild>
                  <Link href="/fields?add=1">Tambah lahan pertama</Link>
                </Button>
              }
            >
              Tambahkan lokasi lahan untuk mulai memantau.
            </EmptyState>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-8">
                <div>
                  <p className="text-3xl font-bold">{formatNumber(fields.data!.length)}</p>
                  <p className="text-xs text-muted-foreground">lahan dipantau</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {formatNumber(
                      fields.data!.reduce((sum, f) => sum + f.areaHa, 0),
                      1,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">hektare total</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{formatNumber(fields.data!.filter((f) => f.lastAnalysis).length)}</p>
                  <p className="text-xs text-muted-foreground">sudah dianalisis</p>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href="/fields">
                  Kelola lahan <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  )
}
