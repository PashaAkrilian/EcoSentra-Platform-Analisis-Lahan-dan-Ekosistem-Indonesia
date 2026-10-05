"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { LocateFixed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { LatLng } from "@/lib/data/types"
import { parseCoordinate, sameLatLng } from "@/lib/form"
import { isInIndonesiaBbox } from "@/lib/geo"

const LocationPickerMap = dynamic(() => import("@/components/forms/location-picker-map"), {
  ssr: false,
  loading: () => <div className="h-[240px] w-full animate-pulse rounded-md bg-muted" />,
})

/**
 * Isian lokasi: koordinat teks (lintang/bujur) + peta untuk klik memilih titik +
 * tombol "Lokasi saya". Nilai `null` berarti belum dipilih.
 */
export function LocationField({
  value,
  onChange,
  errors,
  idPrefix = "loc",
}: {
  value: LatLng | null
  onChange: (value: LatLng | null) => void
  errors?: { lat?: string; lng?: string; _form?: string }
  idPrefix?: string
}) {
  const [latText, setLatText] = useState(value ? String(value.lat) : "")
  const [lngText, setLngText] = useState(value ? String(value.lng) : "")
  const [geoError, setGeoError] = useState<string | null>(null)

  // Nilai terakhir yang dikirim dari ketikan sendiri. Teks hanya disinkronkan ulang kalau `value`
  // berubah dari LUAR (klik peta, tombol lokasi, prefill); kalau tidak, mengetik "107." akan
  // dinormalkan jadi "107" dan titik desimalnya hilang di tengah ketikan.
  const emitted = useRef<LatLng | null>(value)

  useEffect(() => {
    if (sameLatLng(value, emitted.current)) return
    emitted.current = value
    setLatText(value ? String(value.lat) : "")
    setLngText(value ? String(value.lng) : "")
  }, [value])

  const commit = (lat: string, lng: string) => {
    const latNum = parseCoordinate(lat)
    const lngNum = parseCoordinate(lng)
    const next = latNum !== null && lngNum !== null ? { lat: latNum, lng: lngNum } : null
    emitted.current = next
    onChange(next)
  }

  const useMyLocation = () => {
    setGeoError(null)
    if (!("geolocation" in navigator)) {
      setGeoError("Browser ini tidak mendukung geolokasi.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!isInIndonesiaBbox(coords.latitude, coords.longitude)) {
          setGeoError("Lokasi Anda berada di luar wilayah Indonesia.")
          return
        }
        onChange({ lat: Math.round(coords.latitude * 1e5) / 1e5, lng: Math.round(coords.longitude * 1e5) / 1e5 })
      },
      () => setGeoError("Tidak dapat mengambil lokasi — periksa izin lokasi di browser."),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${idPrefix}-lat`}>Lintang (lat)</Label>
          <Input
            id={`${idPrefix}-lat`}
            inputMode="decimal"
            placeholder="-6.2088"
            value={latText}
            aria-invalid={Boolean(errors?.lat)}
            onChange={(e) => {
              setLatText(e.target.value)
              commit(e.target.value, lngText)
            }}
          />
          {errors?.lat && <p className="mt-1 text-xs text-red-700">{errors.lat}</p>}
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-lng`}>Bujur (lng)</Label>
          <Input
            id={`${idPrefix}-lng`}
            inputMode="decimal"
            placeholder="106.8456"
            value={lngText}
            aria-invalid={Boolean(errors?.lng)}
            onChange={(e) => {
              setLngText(e.target.value)
              commit(latText, e.target.value)
            }}
          />
          {errors?.lng && <p className="mt-1 text-xs text-red-700">{errors.lng}</p>}
        </div>
      </div>
      {errors?._form && <p className="text-xs text-red-700">{errors._form}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
          <LocateFixed aria-hidden /> Lokasi saya
        </Button>
        <span className="text-xs text-muted-foreground">atau klik di peta untuk memilih titik.</span>
      </div>
      {geoError && <p className="text-xs text-red-700">{geoError}</p>}
      <LocationPickerMap value={value} onChange={onChange} />
    </div>
  )
}
