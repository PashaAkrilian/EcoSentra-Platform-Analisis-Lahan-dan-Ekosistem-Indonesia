import type Anthropic from "@anthropic-ai/sdk"
import { beforeEach, describe, expect, it, vi } from "vitest"

const runTool = vi.fn()
vi.mock("@/server/assistant/tools", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/assistant/tools")>()),
  runTool: (...args: unknown[]) => runTool(...args),
}))

const { buildSystemPrompt, HISTORY_LIMIT, runClaudeChat, supportsEffort, trimHistory } = await import("@/server/assistant/claude")
type ClaudeClient = import("@/server/assistant/claude").ClaudeClient

beforeEach(() => {
  runTool.mockReset()
})

/** Klien palsu: tiap panggilan stream() mengembalikan pesan berikutnya dari `script`. */
function fakeClient(script: { text?: string; message: Partial<Anthropic.Message> }[]) {
  const calls: Anthropic.MessageStreamParams[] = []
  const client: ClaudeClient = {
    messages: {
      stream(body) {
        calls.push(structuredClone(body))
        const step = script[calls.length - 1] ?? script.at(-1)!
        const listeners: ((delta: string) => void)[] = []
        return {
          on(_event, listener) {
            listeners.push(listener)
            return this
          },
          async finalMessage() {
            if (step.text) listeners.forEach((l) => l(step.text!))
            return { id: "msg", type: "message", role: "assistant", model: "x", usage: {}, stop_sequence: null, content: [], stop_details: null, ...step.message } as Anthropic.Message
          },
        }
      },
    },
  }
  return { client, calls }
}

const toolUse = (id: string, name: string, input: unknown) => ({ type: "tool_use", id, name, input }) as Anthropic.ToolUseBlock

async function run(script: Parameters<typeof fakeClient>[0], overrides: Partial<Parameters<typeof runClaudeChat>[0]> = {}) {
  const { client, calls } = fakeClient(script)
  const events: unknown[] = []
  const result = await runClaudeChat({
    client,
    model: "claude-opus-5-5",
    messages: [{ role: "user", content: "Berapa titik api di Riau?" }],
    context: {},
    emit: (e) => events.push(e),
    ...overrides,
  })
  return { result, events, calls }
}

describe("runClaudeChat", () => {
  it("jawaban langsung: mengalirkan teks tanpa memanggil alat", async () => {
    const { result, events, calls } = await run([
      { text: "NDVI adalah indeks kehijauan.", message: { stop_reason: "end_turn", content: [{ type: "text", text: "NDVI adalah indeks kehijauan." }] as never } },
    ])
    expect(events).toEqual([{ type: "delta", text: "NDVI adalah indeks kehijauan." }])
    expect(result.tools).toEqual([])
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ model: "claude-opus-5-5", output_config: { effort: "medium" } })
    expect((calls[0]!.tools as Anthropic.Tool[]).map((t) => t.name)).toContain("get_fire_hotspots")
    expect(runTool).not.toHaveBeenCalled()
  })

  it("loop alat: menjalankan alat, mengirim tool_result, lalu memberi jawaban akhir", async () => {
    runTool.mockResolvedValue({ content: '{"total":42}', isError: false })
    const assistantTurn = [toolUse("toolu_1", "get_fire_hotspots", { province: "Riau" })]
    const { result, events, calls } = await run([
      { message: { stop_reason: "tool_use", content: assistantTurn } },
      { text: "Ada 42 titik api.", message: { stop_reason: "end_turn", content: [{ type: "text", text: "Ada 42 titik api." }] as never } },
    ])

    expect(runTool).toHaveBeenCalledWith("get_fire_hotspots", { province: "Riau" })
    expect(result.tools).toEqual(["get_fire_hotspots"])
    expect(events).toEqual([
      { type: "tool", name: "get_fire_hotspots", label: "Mengambil data titik api" },
      { type: "delta", text: "Ada 42 titik api." },
    ])
    expect(calls).toHaveLength(2)
    const secondMessages = calls[1]!.messages
    expect(secondMessages.at(-2)).toEqual({ role: "assistant", content: assistantTurn })
    expect(secondMessages.at(-1)).toEqual({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "toolu_1", content: '{"total":42}' }],
    })
  })

  it("beberapa panggilan alat paralel -> semua hasil dalam SATU pesan user; galat ditandai is_error", async () => {
    runTool.mockResolvedValueOnce({ content: '{"ok":1}', isError: false }).mockResolvedValueOnce({ content: '{"error":"gagal"}', isError: true })
    const { calls } = await run([
      { message: { stop_reason: "tool_use", content: [toolUse("a", "get_earthquakes", {}), toolUse("b", "get_weather", { lat: 0, lng: 100 })] } },
      { message: { stop_reason: "end_turn", content: [{ type: "text", text: "ok" }] as never } },
    ])
    const results = calls[1]!.messages.at(-1)!.content as Anthropic.ToolResultBlockParam[]
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ type: "tool_result", tool_use_id: "a", content: '{"ok":1}' })
    expect(results[1]).toEqual({ type: "tool_result", tool_use_id: "b", content: '{"error":"gagal"}', is_error: true })
  })

  it("refusal: tidak menjalankan alat dan memberi pesan yang sopan", async () => {
    const { events } = await run([{ message: { stop_reason: "refusal", content: [toolUse("x", "get_weather", {})] } }])
    expect(runTool).not.toHaveBeenCalled()
    expect(JSON.stringify(events)).toMatch(/tidak dapat menjawab/)
  })

  it("max_tokens: memberi catatan terpotong dan tidak menjalankan alat setengah jadi", async () => {
    const { events } = await run([{ text: "Jawab", message: { stop_reason: "max_tokens", content: [toolUse("x", "get_weather", {})] } }])
    expect(runTool).not.toHaveBeenCalled()
    expect(JSON.stringify(events)).toMatch(/terpotong/)
  })

  it("model terus minta alat -> dihentikan di batas putaran dengan catatan", async () => {
    runTool.mockResolvedValue({ content: "{}", isError: false })
    const { calls, events } = await run([{ message: { stop_reason: "tool_use", content: [toolUse("t", "get_earthquakes", {})] } }])
    expect(calls).toHaveLength(6)
    expect(JSON.stringify(events.at(-1))).toMatch(/Batas langkah/)
  })

  it("jawaban kosong -> pesan cadangan", async () => {
    const { events } = await run([{ message: { stop_reason: "end_turn", content: [] } }])
    expect(JSON.stringify(events)).toMatch(/tidak dapat menyusun jawaban/)
  })

  it("berhenti kalau permintaan dibatalkan klien", async () => {
    const controller = new AbortController()
    controller.abort()
    const { calls } = await run([{ message: { stop_reason: "end_turn", content: [] } }], { signal: controller.signal })
    expect(calls).toHaveLength(0)
  })

  it("model lama tanpa dukungan effort tidak menerima output_config", async () => {
    const { calls } = await run([{ message: { stop_reason: "end_turn", content: [{ type: "text", text: "x" }] as never } }], { model: "claude-haiku-4-5" })
    expect(calls[0]).not.toHaveProperty("output_config")
  })
})

describe("supportsEffort", () => {
  it("hanya keluarga model terbaru", () => {
    for (const ok of ["claude-opus-5-5", "claude-opus-4-8", "claude-sonnet-5-5", "claude-sonnet-4-6", "claude-fable-5-1"]) expect(supportsEffort(ok), ok).toBe(true)
    for (const no of ["claude-haiku-4-5", "claude-sonnet-4-5", "claude-3-7-sonnet"]) expect(supportsEffort(no), no).toBe(false)
  })
})

describe("trimHistory", () => {
  it("memotong ke HISTORY_LIMIT dan selalu diawali pesan user", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: `m${i}` }) as const)
    const trimmed = trimHistory([...many])
    expect(trimmed.length).toBeLessThanOrEqual(HISTORY_LIMIT)
    expect(trimmed[0]!.role).toBe("user")
    expect(trimmed.at(-1)!.content).toBe(many.at(-1)!.content) // pesan terakhir tetap ada
  })
})

describe("buildSystemPrompt", () => {
  it("memuat aturan inti, waktu, dan konteks lokasi bila ada", () => {
    const base = buildSystemPrompt({}, new Date("2026-10-05T12:00:00Z"))
    expect(base).toContain("2026-10-05T12:00:00.000Z")
    expect(base).toMatch(/BUKAN kebakaran terverifikasi/)
    expect(base).not.toMatch(/Konteks: pengguna sedang memilih titik/)

    const withLocation = buildSystemPrompt({ location: { lat: -6.57, lng: 107.76 } })
    expect(withLocation).toContain("lat -6.57, lng 107.76")
  })
})
