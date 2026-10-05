"use client"

import { useCallback, useState } from "react"

/** Pesan galat per-field untuk form; `clear(...keys)` menghapus galat field yang sedang diubah pengguna. */
export function useFormErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const clear = useCallback((...keys: string[]) => {
    setErrors((prev) => {
      if (!keys.some((key) => key in prev)) return prev
      return Object.fromEntries(Object.entries(prev).filter(([key]) => !keys.includes(key)))
    })
  }, [])
  return { errors, setErrors, clear }
}
