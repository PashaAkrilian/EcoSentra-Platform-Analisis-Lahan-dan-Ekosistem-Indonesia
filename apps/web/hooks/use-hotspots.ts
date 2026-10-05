"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchCached, invalidateCached } from "@/lib/client-cache"
import type { HotspotPointsResponse, HotspotRange } from "@/lib/data/types"

/**
 * Titik api ringkas untuk peta. `range = null` menonaktifkan fetch (layer
 * mati). Hasil dibagi lewat cache klien supaya layer peta dan panel analisis
 * titik tidak mengunduh ulang ±800 KB yang sama.
 */
export function useHotspots(range: HotspotRange | null, province?: string | null) {
  const url = range ? `/api/hotspots?range=${range}${province ? `&province=${province}` : ""}` : null
  const [state, setState] = useState<{ data: HotspotPointsResponse | null; error: string | null; isLoading: boolean }>({
    data: null,
    error: null,
    isLoading: url !== null,
  })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!url) {
      setState({ data: null, error: null, isLoading: false })
      return
    }
    let cancelled = false
    setState((prev) => ({ data: prev.data, error: null, isLoading: true }))
    fetchCached<HotspotPointsResponse>(url)
      .then((data) => !cancelled && setState({ data, error: null, isLoading: false }))
      .catch((error: Error) => !cancelled && setState({ data: null, error: error.message, isLoading: false }))
    return () => {
      cancelled = true
    }
  }, [url, reloadKey])

  const reload = useCallback(() => {
    invalidateCached("/api/hotspots")
    setReloadKey((k) => k + 1)
  }, [])

  return { ...state, reload }
}
