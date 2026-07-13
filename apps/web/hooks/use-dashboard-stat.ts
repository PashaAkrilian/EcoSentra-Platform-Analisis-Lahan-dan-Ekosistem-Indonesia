import { useCallback, useEffect, useState } from "react"

interface DashboardStatState<T> {
  data: T | null
  error: string | null
  isLoading: boolean
}

/**
 * Ambil satu statistik dashboard dari fungsi lib/data/*, dengan loading/error
 * state yang benar (bukan cuma tampilan kosong) dan kemampuan retry.
 *
 * Tiap statistik di-fetch independen -> kalau satu gagal, kartu lain tetap
 * tampil normal.
 */
export function useDashboardStat<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<DashboardStatState<T>>({
    data: null,
    error: null,
    isLoading: true,
  })

  const load = useCallback(() => {
    setState({ data: null, error: null, isLoading: true })
    fetcher()
      .then((data) => setState({ data, error: null, isLoading: false }))
      .catch((err) =>
        setState({
          data: null,
          error: err instanceof Error ? err.message : "Gagal memuat data",
          isLoading: false,
        }),
      )
  }, [fetcher])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, retry: load }
}
