import type { LatLng } from "@/lib/data/types"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

/** Konteks dari halaman yang sedang dibuka pengguna, mis. titik yang dipilih di peta. */
export interface AssistantContext {
  location?: LatLng
}

/** Peristiwa yang dialirkan ke klien (NDJSON, satu objek per baris). */
export type AssistantEvent =
  | { type: "mode"; mode: "claude" | "rules"; notice: "login" | null }
  | { type: "tool"; name: string; label: string }
  | { type: "delta"; text: string }
  | { type: "done"; tools: string[] }
  | { type: "error"; message: string }

export type Emit = (event: AssistantEvent) => void
