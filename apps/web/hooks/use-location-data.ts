"use client"

import { useApi } from "@/hooks/use-api"
import { useHotspots } from "@/hooks/use-hotspots"
import type { LandCoverResult, NdviResponse, WeatherResponse } from "@/lib/data/types"

/**
 * Semua data langsung untuk satu lokasi (tutupan lahan, NDVI, cuaca, titik api
 * 24 jam). Dipanggil SEKALI oleh komponen induk lalu hasilnya diteruskan ke
 * bagian-bagian tampilan, supaya tidak ada request ganda ke API.
 */
export function useLocationData(lat: number, lng: number, bufferMeters: number) {
  const point = `lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}`
  return {
    landcover: useApi<LandCoverResult>(`/api/landcover?${point}&buffer=${bufferMeters}`),
    ndvi: useApi<NdviResponse>(`/api/ndvi?${point}`),
    weather: useApi<WeatherResponse>(`/api/weather?${point}`),
    hotspots: useHotspots("24h"),
  }
}

export type LocationData = ReturnType<typeof useLocationData>
