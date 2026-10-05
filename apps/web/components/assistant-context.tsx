"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { LatLng } from "@/lib/data/types"

interface AssistantContextValue {
  /** Titik yang sedang dipilih pengguna di halaman (mis. di peta) — dikirim sebagai konteks ke LandAI. */
  location: LatLng | null
  setLocation: (location: LatLng | null) => void
  /** Pertanyaan yang menunggu dikirim oleh panel LandAI (diisi halaman lain lewat `ask`). */
  pendingQuestion: string | null
  /** Buka panel LandAI dan kirim `question` (mis. dari tombol "Tanya LandAI" di halaman skenario). */
  ask: (question: string) => void
  clearPendingQuestion: () => void
}

const AssistantContext = createContext<AssistantContextValue>({
  location: null,
  setLocation: () => undefined,
  pendingQuestion: null,
  ask: () => undefined,
  clearPendingQuestion: () => undefined,
})

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LatLng | null>(null)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const value = useMemo(
    () => ({
      location,
      setLocation,
      pendingQuestion,
      ask: (question: string) => setPendingQuestion(question),
      clearPendingQuestion: () => setPendingQuestion(null),
    }),
    [location, pendingQuestion],
  )
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
}

export function useAssistantContext() {
  return useContext(AssistantContext)
}

/** Bagikan lokasi halaman ke LandAI selama komponen terpasang; dihapus saat halaman ditinggalkan. */
export function useShareLocationWithAssistant(location: LatLng | null) {
  const { setLocation } = useAssistantContext()
  const lat = location?.lat
  const lng = location?.lng
  useEffect(() => {
    setLocation(lat === undefined || lng === undefined ? null : { lat, lng })
    return () => setLocation(null)
  }, [lat, lng, setLocation])
}
