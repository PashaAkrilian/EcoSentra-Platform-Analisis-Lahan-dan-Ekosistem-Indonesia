"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Bot, Database, MapPin, MessageCircle, RotateCcw, Send, Sparkles, Square, X } from "lucide-react"
import { useAssistantContext } from "@/components/assistant-context"
import { MarkdownLite } from "@/components/chat/markdown-lite"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useChat } from "@/hooks/use-chat"
import { formatLatLng } from "@/lib/geo"

const SUGGESTIONS = [
  "Berapa titik api di Kalimantan Tengah hari ini?",
  "Provinsi mana yang titik apinya paling banyak 7 hari terakhir?",
  "Gempa terbaru apa saja?",
  "Apa itu NDVI dan bagaimana membacanya?",
]
const LOCATION_SUGGESTIONS = ["Bagaimana cuaca di titik ini?", "Bagaimana kondisi vegetasi (NDVI) di sini?", "Apa tutupan lahan di titik ini?"]

/** Asisten LandAI: panel obrolan mengambang yang menjawab dengan data langsung. */
export function AskLandAI() {
  const { location, pendingQuestion, clearPendingQuestion } = useAssistantContext()
  const { messages, mode, isStreaming, send, stop, retry, reset } = useChat(location)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const stickToBottom = useRef(true)

  // Auto-scroll hanya kalau pengguna belum menggulir ke atas membaca jawaban sebelumnya.
  useEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Pertanyaan dari halaman lain (mis. tombol "Tanya LandAI"): buka panel lalu kirim.
  useEffect(() => {
    if (pendingQuestion === null) return
    setOpen(true)
    stickToBottom.current = true
    void send(pendingQuestion)
    clearPendingQuestion()
  }, [pendingQuestion, send, clearPendingQuestion])

  const submit = (text = input) => {
    if (!text.trim() || isStreaming) return
    stickToBottom.current = true
    setInput("")
    void send(text)
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full bg-emerald-700 shadow-xl hover:bg-emerald-800 lg:bottom-6 lg:right-6"
        aria-label="Buka asisten LandAI"
      >
        <MessageCircle className="h-6 w-6" aria-hidden />
      </Button>
    )
  }

  const suggestions = location ? [...LOCATION_SUGGESTIONS, SUGGESTIONS[0]!] : SUGGESTIONS

  return (
    <section
      role="dialog"
      aria-label="Asisten LandAI"
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      className="fixed bottom-4 right-4 z-50 flex h-[min(36rem,calc(100dvh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl lg:bottom-6 lg:right-6"
    >
      <header className="flex items-center gap-2 bg-emerald-800 px-4 py-3 text-white">
        <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-tight">LandAI</h2>
          <p className="truncate text-[11px] text-emerald-100">
            {mode === null ? "Asisten data lahan & ekosistem" : mode.mode === "claude" ? "Ditenagai Claude · data langsung" : "Mode aturan · data langsung"}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/15 hover:text-white" onClick={reset} disabled={messages.length === 0} title="Mulai percakapan baru">
          <RotateCcw aria-hidden />
          <span className="sr-only">Mulai percakapan baru</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/15 hover:text-white" onClick={() => setOpen(false)} title="Tutup">
          <X aria-hidden />
          <span className="sr-only">Tutup asisten</span>
        </Button>
      </header>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Percakapan"
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
        }}
      >
        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white" aria-hidden>
                <Bot className="h-4 w-4" />
              </span>
              <div className="rounded-lg rounded-tl-none bg-muted px-3 py-2 text-sm">
                Halo! Saya LandAI. Saya menjawab pertanyaan tentang titik api, gempa, cuaca, vegetasi, dan tutupan lahan Indonesia
                memakai <strong>data langsung</strong> (NASA FIRMS, BMKG, Open-Meteo, MODIS, Esri).
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Coba tanyakan:</p>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:border-emerald-600 hover:bg-emerald-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white" aria-hidden>
                  <Bot className="h-4 w-4" />
                </span>
              )}
              <div className={`min-w-0 max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "rounded-tr-none bg-emerald-700 text-white" : "rounded-tl-none bg-muted"}`}>
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                ) : (
                  <>
                    {m.status === "streaming" && m.tools.length > 0 && !m.content && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Database className="h-3.5 w-3.5 animate-pulse" aria-hidden /> {m.tools.at(-1)}…
                      </p>
                    )}
                    {m.content ? <MarkdownLite text={m.content} /> : m.status === "streaming" && m.tools.length === 0 && (
                      <span className="flex gap-1 py-1" aria-label="LandAI sedang mengetik">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 120}ms` }} />
                        ))}
                      </span>
                    )}
                    {m.status === "error" && (
                      <div role="alert" className="mt-1 text-xs text-red-700">
                        {m.error}{" "}
                        <button onClick={retry} className="font-semibold underline">
                          Coba lagi
                        </button>
                      </div>
                    )}
                    {m.status === "done" && m.tools.length > 0 && (
                      <p className="mt-2 flex items-center gap-1 border-t border-black/10 pt-1.5 text-[11px] text-muted-foreground">
                        <Database className="h-3 w-3 shrink-0" aria-hidden /> Data langsung: {m.tools.join(", ").toLowerCase()}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
        {mode?.notice === "login" && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Untuk jawaban dari asisten AI penuh, <Link href="/login" className="font-semibold underline">masuk</Link> dulu. Saat ini Anda memakai mode berbasis aturan.
          </p>
        )}
      </div>

      <footer className="border-t bg-background p-3">
        {location && (
          <p className="mb-2 flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] text-emerald-900">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden /> Konteks: titik di peta ({formatLatLng(location.lat, location.lng, 3)})
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="flex items-end gap-2"
        >
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="Tanya tentang lahan Indonesia…"
            aria-label="Pertanyaan untuk LandAI"
            rows={1}
            maxLength={2000}
            className="min-h-10 max-h-28 flex-1 resize-none text-sm"
          />
          {isStreaming ? (
            <Button type="button" size="icon" variant="outline" onClick={stop} title="Hentikan">
              <Square aria-hidden />
              <span className="sr-only">Hentikan jawaban</span>
            </Button>
          ) : (
            <Button type="submit" size="icon" className="bg-emerald-700 hover:bg-emerald-800" disabled={!input.trim()} title="Kirim">
              <Send aria-hidden />
              <span className="sr-only">Kirim</span>
            </Button>
          )}
        </form>
        <p className="mt-2 text-[10px] leading-tight text-muted-foreground">
          LandAI dapat keliru — periksa angka di sumbernya. Bukan peringatan resmi; untuk keselamatan rujuk BMKG/BNPB.
        </p>
      </footer>
    </section>
  )
}
