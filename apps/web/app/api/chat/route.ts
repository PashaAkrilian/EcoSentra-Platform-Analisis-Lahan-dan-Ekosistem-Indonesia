import { chatRequestSchema } from "@/lib/schemas"
import { requireUser } from "@/server/auth"
import { createClaudeClient, DEFAULT_MODEL, describeClaudeError, runClaudeChat, trimHistory } from "@/server/assistant/claude"
import { answerWithRules } from "@/server/assistant/rules"
import { toolLabel } from "@/server/assistant/tools"
import type { AssistantEvent, Emit } from "@/server/assistant/types"
import { isFirebaseAdminConfigured } from "@/server/firebaseAdmin"
import { handleRoute, HttpError, readJsonBody } from "@/server/http"
import { checkRateLimit, enforceRateLimit } from "@/server/rateLimit"

const MAX_BODY_BYTES = 200_000
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Mode asisten:
 * - Tanpa ANTHROPIC_API_KEY -> mode aturan (gratis, tanpa login, tetap memakai data asli).
 * - Dengan kunci + Firebase aktif -> mode Claude HANYA untuk pengguna login (melindungi kunci/biaya
 *   dari penyalahgunaan); yang belum login mendapat mode aturan + saran untuk masuk.
 * - Dengan kunci tanpa Firebase (mis. dev lokal) -> mode Claude dengan batas laju per IP.
 */
async function resolveMode(request: Request): Promise<{ mode: "claude" | "rules"; uid: string | null; notice: "login" | null }> {
  if (!process.env.ANTHROPIC_API_KEY) return { mode: "rules", uid: null, notice: null }
  if (!isFirebaseAdminConfigured()) return { mode: "claude", uid: null, notice: null }
  try {
    const user = await requireUser(request)
    return { mode: "claude", uid: user.uid, notice: null }
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) return { mode: "rules", uid: null, notice: "login" }
    throw error
  }
}

function ndjsonResponse(run: (emit: Emit) => Promise<void>): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit: Emit = (event: AssistantEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        } catch {
          /* klien sudah memutus koneksi */
        }
      }
      try {
        await run(emit)
      } catch (error) {
        emit({ type: "error", message: describeClaudeError(error) })
      } finally {
        try {
          controller.close()
        } catch {
          /* sudah tertutup */
        }
      }
    },
  })
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no", // matikan buffering proxy (nginx) supaya teks mengalir
    },
  })
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    enforceRateLimit(request, "chat", 20, 60_000)
    const body = chatRequestSchema.parse(await readJsonBody(request, MAX_BODY_BYTES))
    const messages = trimHistory(body.messages)
    const question = messages.at(-1)!.content
    const context = { location: body.context?.location }
    const { mode, uid, notice } = await resolveMode(request)

    if (mode === "claude") {
      enforceRateLimit(request, "chat-claude", 8, 60_000)
      if (uid) {
        const daily = checkRateLimit(`chat-claude-day:${uid}`, 150, DAY_MS)
        if (!daily.allowed) throw new HttpError(429, "Batas harian asisten AI tercapai. Coba lagi besok.")
      }
    }

    return ndjsonResponse(async (emit) => {
      emit({ type: "mode", mode, notice })

      if (mode === "claude") {
        const { tools } = await runClaudeChat({
          client: createClaudeClient(),
          model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
          messages,
          context,
          emit,
          signal: request.signal,
        })
        emit({ type: "done", tools })
        return
      }

      const answer = await answerWithRules(question, context)
      for (const name of answer.tools) emit({ type: "tool", name, label: toolLabel(name) })
      emit({ type: "delta", text: answer.text })
      emit({ type: "done", tools: answer.tools })
    })
  })
}
