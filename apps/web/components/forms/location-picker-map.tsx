"use client"

import "leaflet/dist/leaflet.css"
import * as L from "leaflet"
import { useEffect, useRef } from "react"
import { INDONESIA_BBOX, INDONESIA_CENTER } from "@/lib/geo"
import type { LatLng } from "@/lib/data/types"

/**
 * Peta kecil untuk memilih satu titik (klik di peta). Titik juga bisa diubah
 * dari luar lewat `value` (mis. mengetik koordinat) — peta ikut bergeser kalau
 * titik baru berada di luar tampilan saat ini.
 */
export default function LocationPickerMap({
  value,
  onChange,
  height = 240,
}: {
  value: LatLng | null
  onChange: (value: LatLng) => void
  height?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const initialValue = useRef(value)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const start = initialValue.current
    const map = L.map(container, {
      center: start ? [start.lat, start.lng] : [INDONESIA_CENTER.lat, INDONESIA_CENTER.lng],
      zoom: start ? 10 : 4,
      minZoom: 4,
      maxBounds: L.latLngBounds(
        [INDONESIA_BBOX.minLat - 3, INDONESIA_BBOX.minLng - 3],
        [INDONESIA_BBOX.maxLat + 3, INDONESIA_BBOX.maxLng + 3],
      ),
      scrollWheelZoom: false, // supaya halaman/dialog tetap bisa di-scroll
    })
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    map.on("click", (event) => {
      onChangeRef.current({
        lat: Math.round(event.latlng.lat * 1e5) / 1e5,
        lng: Math.round(event.latlng.lng * 1e5) / 1e5,
      })
    })
    mapRef.current = map
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!value) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }
    const latlng = L.latLng(value.lat, value.lng)
    if (markerRef.current) {
      markerRef.current.setLatLng(latlng)
    } else {
      markerRef.current = L.circleMarker(latlng, {
        radius: 8,
        color: "#ffffff",
        weight: 3,
        fillColor: "#047857",
        fillOpacity: 1,
      }).addTo(map)
    }
    if (!map.getBounds().contains(latlng)) map.setView(latlng, Math.max(map.getZoom(), 9))
  }, [value])

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full overflow-hidden rounded-md border bg-slate-100"
      role="application"
      aria-label="Peta pemilih lokasi. Klik di peta untuk memilih titik."
    />
  )
}
