import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { resetRateLimits } from "@/server/rateLimit"
import { apiRequest, fakeDb, firebaseState } from "../helpers/fakeFirebase"

vi.mock("@/server/firebaseAdmin", async () => (await import("../helpers/fakeFirebase")).fakeFirebaseAdminModule())

const answerWithRules = vi.fn()
vi.mock("@/server/assistant/rules", () => ({ answerWithRules: (...a: unknown[]) => answerWithRules(...a) }))

const runClaudeChat = vi.fn()
vi.mock("@/server/assistant/claude", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/assistant/claude")>()),
  createClaudeClient: () => ({ fake: true }),
  runClaudeChat: (...a: unknown[]) => runClaudeChat(...a),
}))

const { POST } = await import("@/app/api/chat/route")

const body = { messages: [{ role: "user", content: "Berapa titik api di Riau?" }], context: { location: { lat: -2.5, lng: 113.8 } } }

async function events(response: Response) {
  return (await response.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))
}

beforeEach(() => {
  fakeDb.reset()
  firebaseState.configured = true
  answerWithRules.mockReset().mockResolvedValue({ text: "Jawaban aturan", tools: ["get_fire_hotspots"] })
  runClaudeChat.mockReset().mockImplementation(async ({ emit }: { emit: (e: unknown) => void }) => {
    emit({ type: "delta", text: "Jawaban Claude" })
    return { tools: [] }
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  resetRateLimits()
})

describe("POST /api/chat", () => {
  it("tanpa ANTHROPIC_API_KEY -> mode aturan, mengalirkan NDJSON (tanpa login)", async () => {
    const res = await POST(apiRequest("/api/chat", { method: "POST", body }))
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toMatch(/application\/x-ndjson/)
    expect(await events(res)).toEqual([
      { type: "mode", mode: "rules", notice: null },
      { type: "tool", name: "get_fire_hotspots", label: "Mengambil data titik api" },
      { type: "delta", text: "Jawaban aturan" },
      { type: "done", tools: ["get_fire_hotspots"] },
    ])
    expect(answerWithRules).toHaveBeenCalledWith("Berapa titik api di Riau?", { location: { lat: -2.5, lng: 113.8 } })
    expect(runClaudeChat).not.toHaveBeenCalled()
  })

  it("dengan kunci & Firebase aktif: belum login -> mode aturan + saran masuk", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test")
    const res = await POST(apiRequest("/api/chat", { method: "POST", body }))
    const stream = await events(res)
    expect(stream[0]).toEqual({ type: "mode", mode: "rules", notice: "login" })
    expect(runClaudeChat).not.toHaveBeenCalled()
  })

  it("dengan kunci & sudah login -> mode Claude memakai model default", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test")
    const res = await POST(apiRequest("/api/chat", { method: "POST", token: "token-alice", body }))
    const stream = await events(res)
    expect(stream).toEqual([
      { type: "mode", mode: "claude", notice: null },
      { type: "delta", text: "Jawaban Claude" },
      { type: "done", tools: [] },
    ])
    expect(runClaudeChat.mock.calls[0]![0]).toMatchObject({ model: "claude-opus-5-5", context: { location: { lat: -2.5, lng: 113.8 } } })
  })

  it("ANTHROPIC_MODEL mengganti model", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test")
    vi.stubEnv("ANTHROPIC_MODEL", "claude-sonnet-5-5")
    await (await POST(apiRequest("/api/chat", { method: "POST", token: "token-alice", body }))).text()
    expect(runClaudeChat.mock.calls[0]![0]).toMatchObject({ model: "claude-sonnet-5-5" })
  })

  it("tanpa Firebase tapi dengan kunci -> mode Claude dengan batas laju ketat (8/menit/IP)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test")
    firebaseState.configured = false
    const request = () =>
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "9.9.9.9" },
        body: JSON.stringify(body),
      })
    for (let i = 0; i < 8; i++) expect((await POST(request())).status).toBe(200)
    const limited = await POST(request())
    expect(limited.status).toBe(429)
    expect(limited.headers.get("retry-after")).toBeTruthy()
  })

  it("galat di tengah aliran dikirim sebagai peristiwa error, bukan memutus koneksi", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test")
    vi.spyOn(console, "error").mockImplementation(() => {})
    runClaudeChat.mockRejectedValue(new Error("boom"))
    const stream = await events(await POST(apiRequest("/api/chat", { method: "POST", token: "token-alice", body })))
    expect(stream.at(-1)).toEqual({ type: "error", message: "Terjadi kesalahan saat memproses pertanyaan." })
  })

  it("memvalidasi body: pesan terakhir harus dari user, isi tidak boleh kosong", async () => {
    const bad = [
      {},
      { messages: [] },
      { messages: [{ role: "assistant", content: "hai" }] },
      { messages: [{ role: "user", content: "   " }] },
      { messages: [{ role: "user", content: "x" }], context: { location: { lat: 48, lng: 2 } } },
    ]
    for (const payload of bad) {
      const res = await POST(apiRequest("/api/chat", { method: "POST", body: payload }))
      expect(res.status, JSON.stringify(payload)).toBe(400)
    }
  })
})
