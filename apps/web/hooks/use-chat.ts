"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import type { LatLng } from "@/lib/data/types"

export interface ChatItem {
  id: string
  role: "user" | "assistant"
  content: string
  /** Label alat data yang dipakai untuk menjawab. */
  tools: string[]
  status: "streaming" | "done" | "error"
  error?: string
}

export interface ChatMode {
  mode: "claude" | "rules"
  notice: "login" | null
}

type ServerEvent =
  | { type: "mode"; mode: "claude" | "rules"; notice: "login" | null }
  | { type: "tool"; name: string; label: string }
  | { type: "delta"; text: string }
  | { type: "done"; tools: string[] }
  | { type: "error"; message: string }

let counter = 0
const nextId = () => `m${Date.now().toString(36)}${(counter++).toString(36)}`

/**
 * Obrolan dengan /api/chat (NDJSON streaming). Menyimpan riwayat di state
 * komponen — dan karena AppShell tidak di-unmount antar-halaman, percakapan
 * bertahan selama pengguna berpindah halaman di dalam aplikasi.
 */
export function useChat(location: LatLng | null) {
  const { getIdToken } = useAuth()
  const [messages, setMessages] = useState<ChatItem[]>([])
  const [mode, setMode] = useState<ChatMode | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<ChatItem[]>([])
  messagesRef.current = messages

  const patchLast = useCallback((patch: (item: ChatItem) => ChatItem) => {
    setMessages((prev) => (prev.length === 0 ? prev : [...prev.slice(0, -1), patch(prev.at(-1)!)]))
  }, [])

  const stop = useCallback(() => controllerRef.current?.abort(), [])

  const send = useCallback(
    async (text: string) => {
      const question = text.trim()
      if (!question || controllerRef.current) return

      const history = messagesRef.current.filter((m) => m.status !== "error" && m.content.trim()).map((m) => ({ role: m.role, content: m.content }))
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", content: question, tools: [], status: "done" },
        { id: nextId(), role: "assistant", content: "", tools: [], status: "streaming" },
      ])
      setIsStreaming(true)

      const controller = new AbortController()
      controllerRef.current = controller
      try {
        const token = await getIdToken()
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            messages: [...history, { role: "user", content: question }].slice(-20),
            context: location ? { location } : undefined,
          }),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          const payload = await response.json().catch(() => null)
          throw new Error((payload as { error?: string } | null)?.error ?? `Permintaan gagal (status ${response.status}).`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let newline: number
          while ((newline = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, newline).trim()
            buffer = buffer.slice(newline + 1)
            if (!line) continue
            const event = JSON.parse(line) as ServerEvent
            if (event.type === "mode") setMode({ mode: event.mode, notice: event.notice })
            else if (event.type === "tool") patchLast((m) => ({ ...m, tools: m.tools.includes(event.label) ? m.tools : [...m.tools, event.label] }))
            else if (event.type === "delta") patchLast((m) => ({ ...m, content: m.content + event.text }))
            else if (event.type === "error") patchLast((m) => ({ ...m, status: "error", error: event.message }))
            else if (event.type === "done") patchLast((m) => (m.status === "error" ? m : { ...m, status: "done" }))
          }
        }
        patchLast((m) => (m.status === "streaming" ? { ...m, status: "done" } : m))
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          patchLast((m) => ({ ...m, status: "done", content: m.content || "_(dihentikan)_" }))
        } else {
          patchLast((m) => ({
            ...m,
            status: "error",
            error: error instanceof Error ? error.message : "Terjadi kesalahan jaringan.",
          }))
        }
      } finally {
        controllerRef.current = null
        setIsStreaming(false)
      }
    },
    [getIdToken, location, patchLast],
  )

  const retry = useCallback(() => {
    const items = messagesRef.current
    const lastUser = [...items].reverse().find((m) => m.role === "user")
    if (!lastUser) return
    // Buang jawaban gagal beserta pertanyaannya, lalu kirim ulang. Ref diperbarui sinkron
    // supaya send() tidak memasukkan pertanyaan yang sama dua kali ke riwayat.
    const trimmed = items.slice(0, items.findLastIndex((m) => m.id === lastUser.id))
    messagesRef.current = trimmed
    setMessages(trimmed)
    void send(lastUser.content)
  }, [send])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    setMessages([])
  }, [])

  useEffect(() => () => controllerRef.current?.abort(), [])

  return { messages, mode, isStreaming, send, stop, retry, reset }
}
