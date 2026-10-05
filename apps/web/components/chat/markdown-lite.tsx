import { Fragment, type ReactNode } from "react"

/**
 * Renderer Markdown ringan untuk jawaban LandAI: paragraf, daftar (- / 1.),
 * **tebal**, _miring_, `kode`, dan tautan http(s)/relatif. Murni elemen React
 * (tidak memakai innerHTML) sehingga teks dari model/alat tidak bisa menyisipkan HTML.
 */

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\((?:https?:\/\/[^)\s]+|\/[^)\s]*)\)|_[^_\n]+_)/g

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`
    if (!part) return null
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={key}>{part.slice(2, -2)}</strong>
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={key} className="rounded bg-black/5 px-1 py-0.5 text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      const external = /^https?:\/\//.test(link[2]!)
      return (
        <a
          key={key}
          href={link[2]}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="font-medium text-emerald-800 underline underline-offset-2"
        >
          {link[1]}
        </a>
      )
    }
    return <Fragment key={key}>{part}</Fragment>
  })
}

type Block = { kind: "p"; lines: string[] } | { kind: "ul" | "ol"; items: string[] }

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const last = blocks.at(-1)

    if (bullet || numbered) {
      const kind = bullet ? "ul" : "ol"
      const content = (bullet ?? numbered)![1]!
      if (last && last.kind === kind) last.items.push(content)
      else blocks.push({ kind, items: [content] })
    } else if (line.trim() === "") {
      blocks.push({ kind: "p", lines: [] }) // pemisah paragraf; blok kosong dibuang saat render
    } else if (last && last.kind === "p" && last.lines.length > 0) {
      last.lines.push(line)
    } else if (last && last.kind === "p") {
      last.lines.push(line)
    } else {
      blocks.push({ kind: "p", lines: [line] })
    }
  }
  return blocks.filter((b) => (b.kind === "p" ? b.lines.length > 0 : true))
}

export function MarkdownLite({ text }: { text: string }) {
  const blocks = parseBlocks(text)
  return (
    <div className="space-y-2 break-words">
      {blocks.map((block, i) => {
        if (block.kind === "p") {
          return (
            <p key={i}>
              {block.lines.map((line, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {renderInline(line, `${i}-${j}`)}
                </Fragment>
              ))}
            </p>
          )
        }
        const List = block.kind === "ul" ? "ul" : "ol"
        return (
          <List key={i} className={`space-y-1 pl-5 ${block.kind === "ul" ? "list-disc" : "list-decimal"}`}>
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
            ))}
          </List>
        )
      })}
    </div>
  )
}
