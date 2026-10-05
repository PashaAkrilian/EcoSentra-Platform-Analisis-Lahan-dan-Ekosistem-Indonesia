"use client"

import { useMemo, type ReactNode } from "react"
import { Download, Droplets, Flame, Leaf, Thermometer, Wind, type LucideIcon } from "lucide-react"
import { NdviChart } from "@/components/charts/ndvi-chart"
import { LandCoverBreakdown } from "@/components/map/land-cover-breakdown"
import { ErrorState, LoadingLines, SourceNote } from "@/components/status"
import { Button } from "@/components/ui/button"
import type { ApiResult } from "@/hooks/use-api"
import { useLocationData, type LocationData } from "@/hooks/use-location-data"
import type { useHotspots } from "@/hooks/use-hotspots"
import type { LandCoverResult, NdviResponse, WeatherResponse } from "@/lib/data/types"
import { formatDate, formatNumber, formatRelative } from "@/lib/format"
import { formatLatLng, nearbyHotspots } from "@/lib/geo"
import { FIRE_CONFIDENCE_LABELS } from "@/lib/map/layers"
import { describeNdvi, ndviTrend } from "@/lib/ndvi"

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-emerald-700" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  )
}

function LandCoverSection({ state: { data, error, isLoading, reload } }: { state: ApiResult<LandCoverResult> }) {
  return (
    <Section icon={Leaf} title="Tutupan lahan">
      {isLoading ? (
        <LoadingLines rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data ? (
        <>
          <p className="text-sm">
            Dominan: <strong>{data.dominantClass}</strong>{" "}
            <span className="text-muted-foreground">
              ({formatNumber(data.classes[0]?.percentage ?? 0, 1)}% dari ±{formatNumber(data.areaHa)} ha)
            </span>
          </p>
          <LandCoverBreakdown
            classes={data.classes}
            ariaLabel={`Komposisi tutupan lahan, dominan ${data.dominantClass}`}
          />
          <SourceNote
            name={data.source.dataset}
            url={data.source.url}
            extra={`${data.source.year}, ±${data.source.resolutionM} m/piksel`}
          />
        </>
      ) : null}
    </Section>
  )
}

function NdviSection({ state: { data, error, isLoading, reload } }: { state: ApiResult<NdviResponse> }) {
  const reliable = data?.observations.filter((o) => o.quality === "baik" || o.quality === "marginal") ?? []
  const trend = ndviTrend(reliable.map((o) => o.ndvi))
  const description = data?.latest ? describeNdvi(data.latest.ndvi) : null

  return (
    <Section icon={Leaf} title="Kesehatan vegetasi (NDVI)">
      {isLoading ? (
        <LoadingLines rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data ? (
        <>
          {data.latest && description ? (
            <p className="text-sm">
              NDVI terbaru <strong>{data.latest.ndvi.toFixed(2)}</strong> ({formatDate(data.latest.date)}) —{" "}
              {description.label.toLowerCase()}.
              {trend && (
                <span className="text-muted-foreground">
                  {" "}
                  {trend.direction === "stabil"
                    ? "Relatif stabil dibanding komposit sebelumnya."
                    : `${trend.direction === "naik" ? "Naik" : "Turun"} ${Math.abs(trend.delta).toFixed(2)} dibanding komposit sebelumnya.`}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Semua observasi terbaru tertutup awan, sehingga NDVI yang andal belum tersedia untuk titik ini.
            </p>
          )}
          <NdviChart observations={data.observations} />
          <SourceNote name={data.source.name} url={data.source.url} extra={`${data.source.product}, ${data.source.resolutionM} m`} />
        </>
      ) : null}
    </Section>
  )
}

function WeatherSection({ state: { data, error, isLoading, reload } }: { state: ApiResult<WeatherResponse> }) {
  return (
    <Section icon={Thermometer} title="Cuaca & kelembapan tanah">
      {isLoading ? (
        <LoadingLines rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data ? (
        <>
          <p className="text-sm">
            <strong className="text-2xl font-bold">{Math.round(data.current.temperatureC)}°C</strong>{" "}
            <span className="text-muted-foreground">{data.current.description}</span>
          </p>
          <dl className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-muted px-2 py-2">
              <dt className="flex items-center justify-center gap-1 text-muted-foreground">
                <Droplets className="h-3 w-3" aria-hidden /> Kelembapan
              </dt>
              <dd className="mt-0.5 text-sm font-semibold">{Math.round(data.current.humidityPct)}%</dd>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <dt className="flex items-center justify-center gap-1 text-muted-foreground">
                <Wind className="h-3 w-3" aria-hidden /> Angin
              </dt>
              <dd className="mt-0.5 text-sm font-semibold">{Math.round(data.current.windSpeedKmh)} km/j</dd>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <dt className="text-muted-foreground">Tanah (model)</dt>
              <dd className="mt-0.5 text-sm font-semibold">
                {data.current.soilMoisture === null ? "—" : `${Math.round(data.current.soilMoisture * 100)}%`}
              </dd>
            </div>
          </dl>
          <table className="w-full text-xs">
            <caption className="sr-only">Prakiraan 7 hari</caption>
            <thead className="text-left text-muted-foreground">
              <tr>
                <th scope="col" className="pb-1 font-medium">Hari</th>
                <th scope="col" className="pb-1 font-medium">Cuaca</th>
                <th scope="col" className="pb-1 text-right font-medium">Suhu</th>
                <th scope="col" className="pb-1 text-right font-medium">Hujan</th>
              </tr>
            </thead>
            <tbody>
              {data.daily.map((day) => (
                <tr key={day.date} className="border-t">
                  <td className="py-1.5 pr-2">{formatDate(day.date)}</td>
                  <td className="py-1.5 pr-2">{day.description}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {Math.round(day.tempMinC)}–{Math.round(day.tempMaxC)}°
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{formatNumber(day.precipitationMm, 1)} mm</td>
                </tr>
              ))}
            </tbody>
          </table>
          <SourceNote name={data.source.name} url="https://open-meteo.com" fetchedAt={data.source.fetchedAt} extra="kelembapan tanah = keluaran model" />
        </>
      ) : null}
    </Section>
  )
}

function FireSection({
  lat,
  lng,
  state: { data, error, isLoading, reload },
}: {
  lat: number
  lng: number
  state: ReturnType<typeof useHotspots>
}) {
  const nearby = useMemo(() => (data ? nearbyHotspots(data.points, { lat, lng }) : null), [data, lat, lng])

  return (
    <Section icon={Flame} title="Titik api di sekitar (24 jam)">
      {isLoading ? (
        <LoadingLines rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : nearby && data ? (
        <>
          <dl className="grid grid-cols-3 gap-2 text-center text-xs">
            {[5, 10, 25].map((radius) => (
              <div key={radius} className="rounded-md bg-muted px-2 py-2">
                <dt className="text-muted-foreground">≤ {radius} km</dt>
                <dd className="mt-0.5 text-sm font-semibold">{formatNumber(nearby.within[radius] ?? 0)}</dd>
              </div>
            ))}
          </dl>
          {nearby.nearest.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada titik api dalam radius 25 km.</p>
          ) : (
            <>
              <p className="text-sm">
                Terdekat: <strong>{nearby.nearestKm!.toFixed(1)} km</strong>
              </p>
              <ul className="divide-y text-xs">
                {nearby.nearest.map((fire, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="tabular-nums">{fire.km.toFixed(1)} km</span>
                    <span className="text-muted-foreground">
                      keyakinan {FIRE_CONFIDENCE_LABELS[fire.confidence].toLowerCase()} · {fire.frpMw.toFixed(1)} MW
                    </span>
                    <span className="text-muted-foreground">
                      {formatRelative(new Date(fire.acquiredAtEpochSec * 1000).toISOString())}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <SourceNote
            name="NASA FIRMS"
            url="https://firms.modaps.eosdis.nasa.gov/active_fire/"
            fetchedAt={data.source.fetchedAt}
            extra="titik api ≠ kebakaran terverifikasi"
          />
        </>
      ) : null}
    </Section>
  )
}

/**
 * Analisis lokasi terpadu: tutupan lahan, NDVI, cuaca, dan titik api di
 * sekitar satu koordinat. Dipakai di halaman Peta, detail Lahan, dan konteks
 * Skenario — semuanya memakai data asli lewat API route yang sama.
 */
export function LocationInsights({
  lat,
  lng,
  bufferMeters,
  allowDownload = true,
  data,
}: {
  lat: number
  lng: number
  bufferMeters: number
  allowDownload?: boolean
  /** Hasil useLocationData yang sudah dipanggil induk (hindari request ganda); kalau kosong, dimuat di sini. */
  data?: LocationData
}) {
  const own = useLocationData(lat, lng, bufferMeters)
  const { landcover, ndvi, weather, hotspots } = data ?? own

  const download = () => {
    const nearby = hotspots.data ? nearbyHotspots(hotspots.data.points, { lat, lng }) : null
    const report = {
      generatedAt: new Date().toISOString(),
      location: { lat, lng, label: formatLatLng(lat, lng) },
      bufferMeters,
      landcover: landcover.data,
      ndvi: ndvi.data,
      weather: weather.data,
      fireHotspots24h: nearby && { nearestKm: nearby.nearestKm, within: nearby.within, nearest: nearby.nearest },
      attribution:
        "Esri/Impact Observatory (tutupan lahan), NASA MODIS/ORNL DAAC (NDVI), Open-Meteo (cuaca), NASA FIRMS (titik api).",
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `analisis-lokasi_${lat.toFixed(4)}_${lng.toFixed(4)}.json`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <LandCoverSection state={landcover} />
      <NdviSection state={ndvi} />
      <WeatherSection state={weather} />
      <FireSection lat={lat} lng={lng} state={hotspots} />
      {allowDownload && (
        <Button
          variant="outline"
          size="sm"
          onClick={download}
          disabled={landcover.isLoading && ndvi.isLoading && weather.isLoading}
        >
          <Download aria-hidden /> Unduh hasil (JSON)
        </Button>
      )}
    </div>
  )
}
