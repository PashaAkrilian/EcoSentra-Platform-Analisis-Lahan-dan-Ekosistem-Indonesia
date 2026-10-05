"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Check, Copy, Download, Flame, Layers, LoaderCircle, MapPinned, Plus } from "lucide-react"
import { useShareLocationWithAssistant } from "@/components/assistant-context"
import { MapLegend } from "@/components/map/map-legend"
import { LocationInsights } from "@/components/map/location-insights"
import { ErrorState } from "@/components/status"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useApi } from "@/hooks/use-api"
import { useHotspots } from "@/hooks/use-hotspots"
import {
  HOTSPOT_RANGES,
  type EarthquakesResponse,
  type HotspotRange,
} from "@/lib/data/types"
import { formatDateTime, formatNumber } from "@/lib/format"
import { formatLatLng, INDONESIA_CENTER, isInIndonesiaBbox } from "@/lib/geo"
import { BASE_LAYERS, RASTER_OVERLAYS, type BaseLayerId, type RasterOverlayId } from "@/lib/map/layers"
import { PROVINCE_OPTIONS, provinceBounds } from "@/lib/provinces"
import type { MapViewState } from "@/components/map/map-view"

const MapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
})

const RANGE_LABELS: Record<HotspotRange, string> = { "24h": "24 jam terakhir", "48h": "48 jam terakhir", "7d": "7 hari terakhir" }
const BUFFER_OPTIONS = [500, 1000, 2500, 5000, 10_000, 25_000]
const FALLBACK_LANDCOVER_YEAR = 2024
const EXPORT_FORMATS = [
  { id: "geojson", label: "GeoJSON (.geojson) — untuk GIS & web" },
  { id: "csv", label: "CSV (.csv) — untuk spreadsheet" },
  { id: "kml", label: "KML (.kml) — untuk Google Earth" },
] as const

function MapPlaceholder() {
  return (
    <div className="flex h-full min-h-[300px] w-full items-center justify-center bg-slate-100 text-sm text-muted-foreground">
      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Memuat peta…
    </div>
  )
}

function parseNumber(value: string | null): number | null {
  if (value === null || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function CheckRow({
  checked,
  onChange,
  title,
  description,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium">{title}</span>
          {description && <span className="block text-xs text-muted-foreground">{description}</span>}
        </span>
      </label>
      {checked && children && <div className="mt-3 space-y-2 pl-7">{children}</div>}
    </div>
  )
}

function MapsContent() {
  const searchParams = useSearchParams()

  // Keadaan awal dari URL (tautan dari halaman Peringatan / bagikan tautan).
  const initial = useMemo(() => {
    const lat = parseNumber(searchParams.get("lat"))
    const lng = parseNumber(searchParams.get("lng"))
    const hasPoint = lat !== null && lng !== null && isInIndonesiaBbox(lat, lng)
    return {
      point: hasPoint ? { lat: lat!, lng: lng! } : null,
      zoom: Math.min(16, Math.max(4, parseNumber(searchParams.get("zoom")) ?? (hasPoint ? 9 : 5))),
      select: searchParams.get("sel") === "1",
      province: PROVINCE_OPTIONS.some((p) => p.iso === searchParams.get("province")) ? searchParams.get("province")! : null,
      fires: searchParams.get("fires") !== "0",
      quakes: searchParams.get("quakes") === "1",
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [base, setBase] = useState<BaseLayerId>("osm")
  const [rasters, setRasters] = useState<Record<RasterOverlayId, boolean>>({ landcover: false, ndvi: false, lst: false })
  const [showProvinces, setShowProvinces] = useState(false)
  const [showFires, setShowFires] = useState(initial.fires)
  const [fireRange, setFireRange] = useState<HotspotRange>("24h")
  const [province, setProvince] = useState(initial.province ?? "all")
  const [showQuakes, setShowQuakes] = useState(initial.quakes)
  const [selected, setSelected] = useState(initial.select ? initial.point : null)
  const [buffer, setBuffer] = useState(1000)
  const [tab, setTab] = useState(initial.select && initial.point ? "analysis" : "layers")
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<{
    lat: number
    lng: number
    zoom: number
    nonce: number
    bounds?: [[number, number], [number, number]]
  }>({
    lat: initial.point?.lat ?? INDONESIA_CENTER.lat,
    lng: initial.point?.lng ?? INDONESIA_CENTER.lng,
    zoom: initial.zoom,
    nonce: 0,
  })
  const viewRef = useRef<MapViewState>({ lat: view.lat, lng: view.lng, zoom: view.zoom })

  // Tautan dengan ?province=ID-XX (mis. dari halaman Profil Ekosistem): zoom ke provinsi itu.
  useEffect(() => {
    const bounds = initial.province ? provinceBounds(initial.province) : null
    if (bounds) setView((v) => ({ ...v, bounds, nonce: v.nonce + 1 }))
  }, [initial.province])

  useShareLocationWithAssistant(selected) // LandAI tahu titik mana yang sedang dipilih
  const hotspots = useHotspots(showFires ? fireRange : null, province === "all" ? null : province)
  const quakes = useApi<EarthquakesResponse>(showQuakes ? "/api/earthquakes" : null)
  const meta = useApi<{ landcoverYear: number | null }>(rasters.landcover ? "/api/meta" : null)

  const handleSelect = useCallback((lat: number, lng: number) => {
    setSelected({ lat, lng })
    setTab("analysis")
    setCopied(false)
    const params = new URLSearchParams({
      lat: lat.toFixed(5),
      lng: lng.toFixed(5),
      zoom: String(viewRef.current.zoom),
      sel: "1",
    })
    window.history.replaceState(null, "", `?${params}`)
  }, [])

  const changeProvince = (value: string) => {
    setProvince(value)
    if (value === "all" && fireRange === "7d") setFireRange("24h")
    const bounds = value === "all" ? null : provinceBounds(value)
    if (bounds) setView((v) => ({ ...v, bounds, nonce: v.nonce + 1 }))
    else if (value === "all") {
      setView({ lat: INDONESIA_CENTER.lat, lng: INDONESIA_CENTER.lng, zoom: 5, nonce: view.nonce + 1 })
    }
  }

  const copyCoords = async () => {
    if (!selected) return
    try {
      await navigator.clipboard.writeText(`${selected.lat.toFixed(6)}, ${selected.lng.toFixed(6)}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard tidak tersedia — abaikan */
    }
  }

  const exportParams = new URLSearchParams({ range: fireRange })
  if (province !== "all") exportParams.set("province", province)

  const [exportFormat, setExportFormat] = useState<(typeof EXPORT_FORMATS)[number]["id"]>("geojson")
  exportParams.set("format", exportFormat)

  const quakeList = quakes.data?.recent ?? null

  return (
    <div className="flex flex-col lg:h-screen lg:flex-row">
      {/* Peta */}
      <div className="relative h-[62vh] min-h-[360px] lg:h-full lg:flex-1">
        <MapView
          baseLayer={base}
          rasters={rasters}
          landcoverYear={meta.data?.landcoverYear ?? FALLBACK_LANDCOVER_YEAR}
          showProvinces={showProvinces}
          hotspots={showFires ? (hotspots.data?.points ?? null) : null}
          quakes={showQuakes ? quakeList : null}
          selected={selected}
          bufferMeters={buffer}
          view={view}
          onSelect={handleSelect}
          onViewChange={(v) => {
            viewRef.current = v
          }}
        />

        {showFires && (
          <div className="absolute left-3 top-3 z-[500] flex max-w-[calc(100%-5rem)] items-center gap-2 rounded-lg border border-black/10 bg-white/95 px-3 py-2 text-xs shadow-md backdrop-blur">
            <Flame className="h-4 w-4 shrink-0 text-orange-600" aria-hidden />
            {hotspots.isLoading ? (
              <span className="flex items-center gap-1.5 text-gray-700">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden /> Memuat titik api…
              </span>
            ) : hotspots.error ? (
              <span className="text-red-700">
                Gagal memuat titik api.{" "}
                <button className="font-semibold underline" onClick={hotspots.reload}>
                  Coba lagi
                </button>
              </span>
            ) : hotspots.data ? (
              <span className="text-gray-800">
                <strong>{formatNumber(hotspots.data.total)}</strong> titik api · {RANGE_LABELS[fireRange]}
                <span className="block text-[11px] text-gray-500">
                  Satelit {hotspots.data.source.satellite} · {formatDateTime(hotspots.data.source.fetchedAt)}
                </span>
              </span>
            ) : null}
          </div>
        )}

        <MapLegend rasters={rasters} showFires={showFires && !!hotspots.data} showQuakes={showQuakes && !!quakeList} />
      </div>

      {/* Panel kontrol */}
      <aside className="w-full border-t bg-background lg:h-full lg:w-[26rem] lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
        <div className="p-4">
          <h1 className="mb-3 text-lg font-bold tracking-tight text-emerald-950">Peta & Analisis</h1>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="layers">
                <Layers className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Layer
              </TabsTrigger>
              <TabsTrigger value="analysis">
                <MapPinned className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Analisis
              </TabsTrigger>
              <TabsTrigger value="export">
                <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Ekspor
              </TabsTrigger>
            </TabsList>

            {/* --- Layer --- */}
            <TabsContent value="layers" className="mt-4 space-y-5">
              <fieldset>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Peta dasar</legend>
                <div className="grid grid-cols-3 gap-2">
                  {BASE_LAYERS.map((layer) => (
                    <label
                      key={layer.id}
                      className={`cursor-pointer rounded-lg border p-2.5 text-center transition-colors ${
                        base === layer.id ? "border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700" : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name="base-layer"
                        value={layer.id}
                        checked={base === layer.id}
                        onChange={() => setBase(layer.id)}
                        className="sr-only"
                      />
                      <span className="block text-sm font-medium">{layer.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{layer.description}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data langsung</legend>

                <CheckRow
                  checked={showFires}
                  onChange={setShowFires}
                  title="Titik api (NASA FIRMS)"
                  description="Anomali panas VIIRS 375 m, diperbarui tiap beberapa jam"
                >
                  <div>
                    <span className="mb-1 block text-xs text-muted-foreground">Rentang waktu</span>
                    <Select value={fireRange} onValueChange={(v) => setFireRange(v as HotspotRange)}>
                      <SelectTrigger aria-label="Rentang waktu titik api">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOTSPOT_RANGES.map((range) => (
                          <SelectItem key={range} value={range} disabled={range === "7d" && province === "all"}>
                            {RANGE_LABELS[range]}
                            {range === "7d" && province === "all" ? " (pilih provinsi)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs text-muted-foreground">Provinsi</span>
                    <Select value={province} onValueChange={changeProvince}>
                      <SelectTrigger aria-label="Filter provinsi">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="all">Seluruh Indonesia</SelectItem>
                        {PROVINCE_OPTIONS.map((p) => (
                          <SelectItem key={p.iso} value={p.iso}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CheckRow>

                <CheckRow
                  checked={showQuakes}
                  onChange={setShowQuakes}
                  title="Gempa bumi M 5+ (BMKG)"
                  description="15 gempa terbaru dengan potensi dampak"
                >
                  {quakes.isLoading && <p className="text-xs text-muted-foreground">Memuat…</p>}
                  {quakes.error && <ErrorState message={quakes.error} onRetry={quakes.reload} />}
                  {quakeList && <p className="text-xs text-muted-foreground">{quakeList.length} gempa ditampilkan.</p>}
                </CheckRow>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lapisan satelit</legend>
                {RASTER_OVERLAYS.map((overlay) => (
                  <CheckRow
                    key={overlay.id}
                    checked={rasters[overlay.id]}
                    onChange={(checked) => setRasters((prev) => ({ ...prev, [overlay.id]: checked }))}
                    title={overlay.label}
                    description={overlay.description}
                  />
                ))}
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Batas wilayah</legend>
                <CheckRow
                  checked={showProvinces}
                  onChange={setShowProvinces}
                  title="Batas provinsi"
                  description="34 provinsi (geoBoundaries) — arahkan kursor untuk nama"
                />
              </fieldset>
            </TabsContent>

            {/* --- Analisis --- */}
            <TabsContent value="analysis" className="mt-4 space-y-4">
              {!selected ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  <MapPinned className="mx-auto mb-2 h-8 w-8" aria-hidden />
                  <p className="font-medium text-foreground">Klik titik mana pun di peta</p>
                  <p className="mt-1">
                    untuk melihat tutupan lahan, kesehatan vegetasi (NDVI), cuaca, dan titik api di sekitarnya.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
                    <span className="min-w-0 truncate text-sm font-medium tabular-nums">{formatLatLng(selected.lat, selected.lng)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyCoords} title="Salin koordinat">
                      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                      <span className="sr-only">Salin koordinat</span>
                    </Button>
                  </div>

                  <div>
                    <span className="mb-1 block text-xs text-muted-foreground">Radius analisis tutupan lahan</span>
                    <Select value={String(buffer)} onValueChange={(v) => setBuffer(Number(v))}>
                      <SelectTrigger aria-label="Radius analisis">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUFFER_OPTIONS.map((meters) => (
                          <SelectItem key={meters} value={String(meters)}>
                            {meters >= 1000 ? `${meters / 1000} km` : `${meters} m`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <LocationInsights lat={selected.lat} lng={selected.lng} bufferMeters={buffer} />

                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/fields?add=1&lat=${selected.lat.toFixed(5)}&lng=${selected.lng.toFixed(5)}`}>
                      <Plus aria-hidden /> Simpan sebagai lahan saya
                    </Link>
                  </Button>
                </>
              )}
            </TabsContent>

            {/* --- Ekspor --- */}
            <TabsContent value="export" className="mt-4 space-y-4">
              <div className="rounded-lg border p-4">
                <h2 className="text-sm font-semibold">Unduh data titik api</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Data asli dari NASA FIRMS (VIIRS 375 m), sudah difilter ke daratan Indonesia dan diberi label provinsi.
                  Memakai rentang waktu & provinsi yang dipilih di tab Layer.
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted px-3 py-2">
                    <dt className="text-muted-foreground">Rentang</dt>
                    <dd className="font-medium">{RANGE_LABELS[fireRange]}</dd>
                  </div>
                  <div className="rounded-md bg-muted px-3 py-2">
                    <dt className="text-muted-foreground">Wilayah</dt>
                    <dd className="truncate font-medium">
                      {province === "all" ? "Seluruh Indonesia" : (PROVINCE_OPTIONS.find((p) => p.iso === province)?.name ?? province)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Format</span>
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as typeof exportFormat)}>
                    <SelectTrigger aria-label="Format ekspor">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPORT_FORMATS.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {fireRange === "7d" && province === "all" ? (
                  <p className="mt-3 text-xs text-amber-800">Rentang 7 hari terlalu besar untuk seluruh Indonesia — pilih provinsi di tab Layer.</p>
                ) : (
                  <Button asChild className="mt-4 w-full">
                    <a href={`/api/hotspots/export?${exportParams}`} download>
                      <Download aria-hidden /> Unduh {exportFormat.toUpperCase()}
                    </a>
                  </Button>
                )}
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Maksimum 25.000 titik per file. Titik api adalah anomali panas satelit, bukan kebakaran yang sudah
                  diverifikasi. Cantumkan NASA FIRMS sebagai sumber.
                </p>
              </div>
              <div className="rounded-lg border p-4 text-xs text-muted-foreground">
                <h2 className="mb-1 text-sm font-semibold text-foreground">Hasil analisis titik</h2>
                Pilih titik di peta, lalu gunakan tombol <strong>Unduh hasil (JSON)</strong> di tab Analisis untuk menyimpan
                tutupan lahan, NDVI, cuaca, dan titik api di sekitarnya.
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </aside>
    </div>
  )
}

export default function MapsPage() {
  return (
    <Suspense fallback={<MapPlaceholder />}>
      <MapsContent />
    </Suspense>
  )
}
