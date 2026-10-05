"use client"

import Link from "next/link"
import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Building2, Droplets, Flame, Map as MapIcon, Ruler, TreePine, Wheat } from "lucide-react"
import { BarList } from "@/components/charts/bar-list"
import { ChartTable, ENTITY_COLORS } from "@/components/charts/chart-utils"
import { ColumnChart, type ColumnDatum } from "@/components/charts/column-chart"
import { LandCoverBreakdown } from "@/components/map/land-cover-breakdown"
import { PageContainer, PageHeader } from "@/components/page-header"
import { ErrorState, LoadingLines, SourceNote, StatTile } from "@/components/status"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useApi } from "@/hooks/use-api"
import type { HotspotSummary, ProvinceLandCover } from "@/lib/data/types"
import { formatDate, formatNumber } from "@/lib/format"
import { PROVINCE_OPTIONS, provinceAreaKm2 } from "@/lib/provinces"

const DEFAULT_ISO = "ID-KT"

function shortDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })
}

function EcosystemContent() {
  const params = useSearchParams()
  const requested = params.get("province")
  const [iso, setIso] = useState(PROVINCE_OPTIONS.some((p) => p.iso === requested) ? requested! : DEFAULT_ISO)

  const province = PROVINCE_OPTIONS.find((p) => p.iso === iso)!
  const landcover = useApi<ProvinceLandCover>(`/api/ecosystem/province?iso=${iso}`)
  const fires7dProvince = useApi<HotspotSummary>(`/api/hotspots/summary?range=7d&province=${iso}`)
  const fires7d = useApi<HotspotSummary>("/api/hotspots/summary?range=7d")
  const fires24h = useApi<HotspotSummary>("/api/hotspots/summary?range=24h")

  const share = (code: number) => landcover.data?.classes.find((c) => c.code === code)?.percentage ?? 0
  const areaKm2 = provinceAreaKm2(iso) ?? 0

  const count24h = fires24h.data?.byProvince.find((p) => p.iso === iso)?.count ?? 0
  const count7d = fires7d.data?.byProvince.find((p) => p.iso === iso)?.count ?? 0
  const density7d = areaKm2 ? (count7d / areaKm2) * 1000 : 0

  const dailyData: ColumnDatum[] = useMemo(() => {
    const days = fires7dProvince.data?.byDay ?? []
    return days.map((d, i) => {
      const partial = days.length >= 3 && (i === 0 || i === days.length - 1)
      return {
        key: d.date,
        label: shortDay(d.date),
        fullLabel: `${formatDate(d.date)}${partial ? " (sebagian hari)" : ""}`,
        value: d.count,
        partial,
      }
    })
  }, [fires7dProvince.data])

  const ranking = useMemo(() => {
    const counts = new Map((fires7d.data?.byProvince ?? []).map((p) => [p.iso, p.count]))
    return PROVINCE_OPTIONS.map((p) => {
      const area = provinceAreaKm2(p.iso) ?? 1
      const count = counts.get(p.iso) ?? 0
      return { iso: p.iso, name: p.name, island: p.island, area, count, density: (count / area) * 1000 }
    }).sort((a, b) => b.density - a.density)
  }, [fires7d.data])

  const landcoverLoading = landcover.isLoading

  return (
    <PageContainer>
      <PageHeader
        title="Profil Ekosistem"
        description="Komposisi tutupan lahan dan tekanan kebakaran per provinsi, dihitung dari data satelit terbuka."
        actions={
          <>
            <div className="w-64 max-w-full">
              <Select value={iso} onValueChange={setIso}>
                <SelectTrigger aria-label="Pilih provinsi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {PROVINCE_OPTIONS.map((p) => (
                    <SelectItem key={p.iso} value={p.iso}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button asChild variant="outline">
              <Link href={`/maps?province=${iso}&fires=1`}>
                <MapIcon aria-hidden /> Lihat di peta
              </Link>
            </Button>
          </>
        }
      />

      <section aria-label={`Ringkasan ${province.name}`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Luas wilayah" icon={Ruler} accent="bg-slate-100 text-slate-700" value={`${formatNumber(areaKm2)} km²`} note={`Pulau/kawasan: ${province.island}`} />
        <StatTile
          label="Pepohonan"
          icon={TreePine}
          accent="bg-emerald-100 text-emerald-700"
          isLoading={landcoverLoading}
          error={landcover.error}
          onRetry={landcover.reload}
          value={`${formatNumber(share(2), 1)}%`}
          note="dari luas provinsi (sampel piksel)"
        />
        <StatTile
          label="Tanaman pertanian"
          icon={Wheat}
          accent="bg-amber-100 text-amber-700"
          isLoading={landcoverLoading}
          error={landcover.error}
          onRetry={landcover.reload}
          value={`${formatNumber(share(5), 1)}%`}
          note="sawah, ladang, dan sejenisnya"
        />
        <StatTile
          label="Area terbangun"
          icon={Building2}
          accent="bg-red-100 text-red-700"
          isLoading={landcoverLoading}
          error={landcover.error}
          onRetry={landcover.reload}
          value={`${formatNumber(share(7), 1)}%`}
          note="permukiman, jalan, industri"
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Komposisi tutupan lahan — {province.name}</CardTitle>
            <CardDescription>Persentase luas per kelas (klasifikasi otomatis Sentinel-2 10 m).</CardDescription>
          </CardHeader>
          <CardContent>
            {landcoverLoading ? (
              <div className="space-y-3" aria-busy="true">
                <Skeleton className="h-3 w-full" />
                <LoadingLines rows={5} />
                <p className="text-xs text-muted-foreground">Menghitung dari citra satelit — bisa sampai beberapa detik untuk provinsi besar.</p>
              </div>
            ) : landcover.error ? (
              <ErrorState message={landcover.error} onRetry={landcover.reload} />
            ) : landcover.data ? (
              <>
                <LandCoverBreakdown classes={landcover.data.classes} ariaLabel={`Komposisi tutupan lahan ${province.name}`} />
                <SourceNote
                  className="mt-4"
                  name={landcover.data.source.dataset}
                  url={landcover.data.source.url}
                  extra={`${landcover.data.source.year}, sampel ±${landcover.data.source.sampleResolutionM} m/piksel`}
                />
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Titik api — {province.name}</CardTitle>
            <CardDescription>Anomali panas VIIRS di daratan provinsi ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted px-2 py-3">
                <dt className="text-xs text-muted-foreground">24 jam</dt>
                <dd className="mt-0.5 text-2xl font-bold tabular-nums">{fires24h.isLoading ? "–" : formatNumber(count24h)}</dd>
              </div>
              <div className="rounded-lg bg-muted px-2 py-3">
                <dt className="text-xs text-muted-foreground">7 hari</dt>
                <dd className="mt-0.5 text-2xl font-bold tabular-nums">{fires7d.isLoading ? "–" : formatNumber(count7d)}</dd>
              </div>
              <div className="rounded-lg bg-muted px-2 py-3">
                <dt className="text-xs text-muted-foreground">per 1.000 km² (7 hari)</dt>
                <dd className="mt-0.5 text-2xl font-bold tabular-nums">{fires7d.isLoading ? "–" : formatNumber(density7d, 1)}</dd>
              </div>
            </dl>
            <div className="mt-4">
              {fires7dProvince.isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : fires7dProvince.error ? (
                <ErrorState message={fires7dProvince.error} onRetry={fires7dProvince.reload} />
              ) : (
                <>
                  <ColumnChart
                    data={dailyData}
                    color={ENTITY_COLORS.fire}
                    height={200}
                    unit="titik api"
                    ariaLabel={`Titik api per hari di ${province.name}, 7 hari terakhir`}
                  />
                  <ChartTable
                    caption={`Titik api per hari di ${province.name}`}
                    columns={["Tanggal (WIB)", "Titik api"]}
                    rows={dailyData.map((d) => [d.fullLabel ?? d.label, d.value])}
                  />
                </>
              )}
            </div>
            {fires7d.data && (
              <SourceNote
                className="mt-3"
                name="NASA FIRMS"
                url="https://firms.modaps.eosdis.nasa.gov/active_fire/"
                fetchedAt={fires7d.data.source.fetchedAt}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-orange-600" aria-hidden /> Kepadatan titik api antar provinsi — 7 hari terakhir
          </CardTitle>
          <CardDescription>
            Titik api per 1.000 km² daratan. Kepadatan membandingkan provinsi besar dan kecil secara adil; angka mentah ada di tabel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fires7d.isLoading ? (
            <LoadingLines rows={8} />
          ) : fires7d.error ? (
            <ErrorState message={fires7d.error} onRetry={fires7d.reload} />
          ) : (
            <>
              <BarList
                ariaLabel="Titik api per 1.000 km² per provinsi, 7 hari terakhir"
                color={ENTITY_COLORS.fire}
                items={ranking.slice(0, 10).map((r) => ({
                  key: r.iso,
                  label: r.name,
                  value: Math.round(r.density * 10) / 10,
                  detail: (
                    <>
                      <strong>{formatNumber(r.count)}</strong> titik api · {formatNumber(r.area)} km²
                    </>
                  ),
                }))}
              />
              <details className="mt-5 text-sm">
                <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground">
                  Tabel seluruh provinsi
                </summary>
                <div className="mt-2 max-h-96 overflow-auto rounded-md border">
                  <table className="w-full text-left text-xs">
                    <caption className="sr-only">Titik api 7 hari per provinsi</caption>
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-medium">Provinsi</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Luas (km²)</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Titik api</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Per 1.000 km²</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((r) => (
                        <tr key={r.iso} className={`border-t ${r.iso === iso ? "bg-emerald-50" : ""}`}>
                          <th scope="row" className="px-3 py-1.5 font-medium">
                            <button className="text-left hover:underline" onClick={() => setIso(r.iso)}>
                              {r.name}
                            </button>
                          </th>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(r.area)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(r.count)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(r.density, 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
        <Droplets className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Persentase tutupan lahan dihitung dari sampel piksel klasifikasi Esri/Impact Observatory dan dapat berbeda dari data
          resmi KLHK. Kelas “Pepohonan” mencakup hutan alam <em>dan</em> kebun berpohon (mis. sawit, karet). Titik api bukan
          kebakaran terverifikasi. Selengkapnya di{" "}
          <Link href="/help#keterbatasan" className="font-medium text-emerald-800 underline underline-offset-2">
            Bantuan & Metodologi
          </Link>
          .
        </span>
      </p>
    </PageContainer>
  )
}

export default function EcosystemPage() {
  return (
    <Suspense fallback={<PageContainer><LoadingLines rows={6} /></PageContainer>}>
      <EcosystemContent />
    </Suspense>
  )
}
