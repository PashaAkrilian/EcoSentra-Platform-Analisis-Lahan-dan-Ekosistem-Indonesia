"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { apiFetch, errorMessage } from "@/lib/api-client"

interface UseApiOptions {
  /** Kirim ID token login. Kalau user belum login, request tidak dijalankan. */
  auth?: boolean
}

interface UseApiState<T> {
  data: T | null
  error: string | null
  isLoading: boolean
}

export interface ApiResult<T> {
  data: T | null
  error: string | null
  isLoading: boolean
  reload: () => void
}

/**
 * GET ke API route dengan state loading/error/retry. `path = null` berarti
 * jangan fetch (mis. menunggu input). Request lama dibatalkan saat path
 * berubah atau komponen unmount.
 */
export function useApi<T>(path: string | null, { auth = false }: UseApiOptions = {}) {
  const { user, loading: authLoading, getIdToken } = useAuth()
  const [state, setState] = useState<UseApiState<T>>({ data: null, error: null, isLoading: path !== null })
  const [reloadKey, setReloadKey] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  const blockedByAuth = auth && (authLoading || !user)

  useEffect(() => {
    if (path === null || blockedByAuth) {
      // Belum ada yang perlu di-fetch (atau user logout) -> jangan tampilkan data lama.
      setState({ data: null, error: null, isLoading: path !== null && authLoading })
      return
    }

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setState((prev) => ({ data: prev.data, error: null, isLoading: true }))

    ;(async () => {
      try {
        const token = auth ? await getIdToken() : null
        const data = await apiFetch<T>(path, { token, signal: controller.signal })
        if (!controller.signal.aborted) setState({ data, error: null, isLoading: false })
      } catch (error) {
        if (controller.signal.aborted) return
        setState({ data: null, error: errorMessage(error), isLoading: false })
      }
    })()

    return () => controller.abort()
  }, [path, auth, blockedByAuth, authLoading, getIdToken, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])
  const setData = useCallback((updater: (prev: T | null) => T | null) => {
    setState((prev) => ({ ...prev, data: updater(prev.data) }))
  }, [])

  return { ...state, reload, setData }
}

/** Fungsi pemanggil API dengan token login otomatis — untuk POST/PATCH/DELETE. */
export function useAuthedFetch() {
  const { getIdToken } = useAuth()
  return useCallback(
    async <T,>(path: string, options: Omit<Parameters<typeof apiFetch>[1], "token"> = {}) =>
      apiFetch<T>(path, { ...options, token: await getIdToken() }),
    [getIdToken],
  )
}
