"use client"

import "leaflet/dist/leaflet.css"
import * as L from "leaflet"
import { useEffect, useRef } from "react"
import { fetchCached } from "@/lib/client-cache"
import type { CompactHotspot, Earthquake } from "@/lib/data/types"
import { formatDateTime } from "@/lib/format"
import { formatLatLng, INDONESIA_BBOX } from "@/lib/geo"
import {
  BASE_LAYERS,
  buildLandCoverTileUrl,
  FIRE_CONFIDENCE_COLORS,
  FIRE_CONFIDENCE_LABELS,
  fireRadius,
  quakeRadius,
  RASTER_OVERLAYS,
  type BaseLayerId,
  type RasterOverlayId,
} from "@/lib/map/layers"
import { provinceName } from "@/lib/provinces"

export interface MapViewState {
  lat: number
  lng: number
  zoom: number
}

export interface MapViewProps {
  baseLayer: BaseLayerId
  rasters: Record<RasterOverlayId, boolean>
  landcoverYear: number
  showProvinces: boolean
  /** null = layer titik api mati. */
  hotspots: CompactHotspot[] | null
  /** null = layer gempa mati. */
  quakes: Earthquake[] | null
  selected: { lat: number; lng: number } | null
  bufferMeters: number
  /** Berubahnya `nonce` memicu animasi terbang ke posisi `target`. */
  view: {
    lat: number
    lng: number
    zoom: number
    nonce: number
    /** Kalau ada, peta menyesuaikan ke kotak ini ([[lat, lng] barat-daya, [lat, lng] timur-laut]) alih-alih ke lat/lng/zoom. */
    bounds?: [[number, number], [number, number]]
  }
  onSelect: (lat: number, lng: number) => void
  onViewChange?: (view: MapViewState) => void
}

const MAX_BOUNDS = L.latLngBounds(
  [INDONESIA_BBOX.minLat - 3, INDONESIA_BBOX.minLng - 3],
  [INDONESIA_BBOX.maxLat + 3, INDONESIA_BBOX.maxLng + 3],
)

const QUAKE_COLOR = "#4a3aa7"
const PANES = { rasters: 250, provinces: 350, quakes: 600, fires: 620, selection: 700 } as const

/** Bangun isi popup dari DOM (textContent) — data eksternal tidak pernah lewat innerHTML. */
function buildPopup(title: string, rows: [string, string][], footnote?: string): HTMLElement {
  const root = document.createElement("div")
  root.className = "min-w-[180px]"
  const heading = document.createElement("div")
  heading.className = "mb-1.5 text-sm font-semibold text-gray-900"
  heading.textContent = title
  root.append(heading)
  for (const [label, value] of rows) {
    const row = document.createElement("div")
    row.className = "flex justify-between gap-4 text-xs"
    const l = document.createElement("span")
    l.className = "text-gray-500"
    l.textContent = label
    const v = document.createElement("span")
    v.className = "text-right font-medium text-gray-900"
    v.textContent = value
    row.append(l, v)
    root.append(row)
  }
  if (footnote) {
    const note = document.createElement("div")
    note.className = "mt-2 border-t pt-1.5 text-[11px] text-gray-500"
    note.textContent = footnote
    root.append(note)
  }
  return root
}

export default function MapView(props: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props

  const baseRef = useRef<L.TileLayer | null>(null)
  const rasterRefs = useRef<Partial<Record<RasterOverlayId, L.TileLayer>>>({})
  const provincesRef = useRef<L.GeoJSON | null>(null)
  const firesRef = useRef<L.LayerGroup | null>(null)
  const quakesRef = useRef<L.LayerGroup | null>(null)
  const selectionRef = useRef<L.LayerGroup | null>(null)
  const lastNonce = useRef(props.view.nonce)

  // --- Inisialisasi peta (sekali) -------------------------------------------
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = L.map(container, {
      center: [propsRef.current.view.lat, propsRef.current.view.lng],
      zoom: propsRef.current.view.zoom,
      minZoom: 4,
      maxZoom: 18,
      maxBounds: MAX_BOUNDS,
      maxBoundsViscosity: 0.7,
      zoomControl: false,
      preferCanvas: true,
    })
    L.control.zoom({ position: "topright", zoomInTitle: "Perbesar", zoomOutTitle: "Perkecil" }).addTo(map)
    L.control.scale({ metric: true, imperial: false, position: "bottomleft" }).addTo(map)

    for (const [name, zIndex] of Object.entries(PANES)) {
      map.createPane(name).style.zIndex = String(zIndex)
    }

    map.on("click", (event) => propsRef.current.onSelect(event.latlng.lat, event.latlng.lng))
    map.on("moveend", () => {
      const center = map.getCenter()
      propsRef.current.onViewChange?.({ lat: center.lat, lng: center.lng, zoom: map.getZoom() })
    })

    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)

    mapRef.current = map
    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      baseRef.current = null
      rasterRefs.current = {}
      provincesRef.current = null
      firesRef.current = null
      quakesRef.current = null
      selectionRef.current = null
    }
  }, [])

  // --- Peta dasar -------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const spec = BASE_LAYERS.find((layer) => layer.id === props.baseLayer) ?? BASE_LAYERS[0]!
    baseRef.current?.remove()
    const layer = L.tileLayer(spec.url, {
      attribution: spec.attribution,
      maxZoom: spec.maxZoom,
      subdomains: spec.subdomains ?? "abc",
    }).addTo(map)
    layer.bringToBack()
    baseRef.current = layer
  }, [props.baseLayer])

  // --- Overlay raster (tutupan lahan, NDVI, suhu) ---------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    for (const spec of RASTER_OVERLAYS) {
      const existing = rasterRefs.current[spec.id]
      const wanted = props.rasters[spec.id]

      if (spec.id === "landcover" && existing && (existing as L.TileLayer & { _year?: number })._year !== props.landcoverYear) {
        existing.remove()
        delete rasterRefs.current[spec.id]
      }
      if (!wanted) {
        rasterRefs.current[spec.id]?.remove()
        delete rasterRefs.current[spec.id]
        continue
      }
      if (rasterRefs.current[spec.id]) continue

      const options: L.TileLayerOptions = {
        pane: "rasters",
        opacity: spec.opacity,
        attribution: spec.tile.attribution,
        maxZoom: spec.tile.maxZoom,
        maxNativeZoom: spec.tile.maxNativeZoom,
      }
      let layer: L.TileLayer
      if (spec.id === "landcover") {
        const year = props.landcoverYear
        layer = L.tileLayer("", options)
        layer.getTileUrl = (coords) => buildLandCoverTileUrl(coords.z, coords.x, coords.y, year)
        ;(layer as L.TileLayer & { _year?: number })._year = year
      } else {
        layer = L.tileLayer(spec.tile.url, options)
      }
      layer.addTo(map)
      rasterRefs.current[spec.id] = layer
    }
  }, [props.rasters, props.landcoverYear])

  // --- Batas provinsi -----------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!props.showProvinces) {
      provincesRef.current?.remove()
      provincesRef.current = null
      return
    }
    let cancelled = false
    fetchCached<GeoJSON.FeatureCollection>("/api/geo/provinces", 24 * 60 * 60 * 1000)
      .then((data) => {
        if (cancelled || !mapRef.current) return
        provincesRef.current?.remove()
        provincesRef.current = L.geoJSON(data, {
          // preferCanvas: pane khusus otomatis mendapat renderer canvas sendiri.
          pane: "provinces",
          style: { color: "#0f766e", weight: 1.25, opacity: 0.85, fillColor: "#0f766e", fillOpacity: 0.02 },
          onEachFeature: (feature, layer) => {
            layer.bindTooltip(String(feature.properties?.name ?? ""), { sticky: true, direction: "top" })
          },
        }).addTo(map)
      })
      .catch(() => undefined) // gagal memuat batas provinsi tidak boleh merusak peta
    return () => {
      cancelled = true
    }
  }, [props.showProvinces])

  // --- Titik api ----------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    firesRef.current?.remove()
    firesRef.current = null
    if (!props.hotspots) return

    const renderer = L.canvas({ pane: "fires" })
    const group = L.layerGroup()
    for (const point of props.hotspots) {
      const [lat, lng, frp, confidence, epochSec, iso] = point
      const marker = L.circleMarker([lat, lng], {
        renderer,
        pane: "fires",
        radius: fireRadius(frp),
        fillColor: FIRE_CONFIDENCE_COLORS[confidence],
        fillOpacity: 0.85,
        color: "#ffffff",
        weight: 0.75,
        opacity: 0.8,
        bubblingMouseEvents: false,
      })
      marker.on("click", () => {
        L.popup({ maxWidth: 260, closeButton: true })
          .setLatLng([lat, lng])
          .setContent(
            buildPopup(
              "Titik api",
              [
                ["Keyakinan", FIRE_CONFIDENCE_LABELS[confidence]],
                ["Terdeteksi", formatDateTime(new Date(epochSec * 1000).toISOString())],
                ["Provinsi", provinceName(iso)],
                ["Daya radiatif", `${frp.toFixed(1)} MW`],
                ["Koordinat", formatLatLng(lat, lng)],
              ],
              "Anomali panas dari satelit VIIRS — perlu verifikasi lapangan.",
            ),
          )
          .openOn(map)
      })
      group.addLayer(marker)
    }
    group.addTo(map)
    firesRef.current = group
  }, [props.hotspots])

  // --- Gempa bumi ------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    quakesRef.current?.remove()
    quakesRef.current = null
    if (!props.quakes) return

    const renderer = L.canvas({ pane: "quakes" })
    const group = L.layerGroup()
    for (const quake of props.quakes) {
      const marker = L.circleMarker([quake.lat, quake.lng], {
        renderer,
        pane: "quakes",
        radius: quakeRadius(quake.magnitude),
        fillColor: QUAKE_COLOR,
        fillOpacity: 0.55,
        color: "#ffffff",
        weight: 2,
        bubblingMouseEvents: false,
      })
      marker.on("click", () => {
        L.popup({ maxWidth: 280 })
          .setLatLng([quake.lat, quake.lng])
          .setContent(
            buildPopup(
              `Gempa M ${quake.magnitude.toFixed(1)}`,
              [
                ["Waktu", formatDateTime(quake.occurredAt)],
                ["Kedalaman", `${quake.depthKm} km`],
                ["Wilayah", quake.region],
                ...(quake.potential ? ([["Potensi", quake.potential]] as [string, string][]) : []),
                ...(quake.felt ? ([["Dirasakan (MMI)", quake.felt]] as [string, string][]) : []),
              ],
              "Sumber: BMKG",
            ),
          )
          .openOn(map)
      })
      group.addLayer(marker)
    }
    group.addTo(map)
    quakesRef.current = group
  }, [props.quakes])

  // --- Titik terpilih & radius analisis ------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    selectionRef.current?.remove()
    selectionRef.current = null
    if (!props.selected) return

    const { lat, lng } = props.selected
    const group = L.layerGroup([
      L.circle([lat, lng], {
        pane: "selection",
        radius: props.bufferMeters,
        color: "#047857",
        weight: 2,
        fillColor: "#047857",
        fillOpacity: 0.1,
        interactive: false,
      }),
      L.circleMarker([lat, lng], {
        pane: "selection",
        radius: 7,
        color: "#ffffff",
        weight: 3,
        fillColor: "#047857",
        fillOpacity: 1,
        interactive: false,
      }),
    ]).addTo(map)
    selectionRef.current = group
  }, [props.selected, props.bufferMeters])

  // --- Terbang ke posisi baru ---------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || lastNonce.current === props.view.nonce) return
    lastNonce.current = props.view.nonce
    if (props.view.bounds) {
      map.flyToBounds(props.view.bounds, { padding: [24, 24], duration: 0.8 })
    } else {
      map.flyTo([props.view.lat, props.view.lng], props.view.zoom, { duration: 0.8 })
    }
  }, [props.view])

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Peta interaktif Indonesia. Gunakan tombol panah untuk menggeser dan tanda plus/minus untuk zoom. Klik untuk memilih titik analisis."
      className="h-full w-full bg-slate-100"
    />
  )
}

