"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

// Warna entitas — konsisten di grafik & peta (palet tervalidasi, lihat
// docs/architecture.md bagian "Visualisasi"). Teks tidak pernah memakai warna ini.
export const ENTITY_COLORS = {
  fire: "#eb6834",
  vegetation: "#008300",
  water: "#2a78d6",
  quake: "#4a3aa7",
  muted: "#898781",
} as const

export const CHART_CHROME = {
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  mutedInk: "#6b6a65",
} as const

/** Lebar elemen (ResizeObserver) — grafik SVG digambar ulang sesuai lebar kontainer. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry!.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** Tick sumbu-y yang "bulat" (0, 500, 1.000, ...). */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0]
  const rawStep = max / count
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep)!
  const ticks: number[] = []
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  if (ticks.at(-1)! < max) ticks.push(ticks.at(-1)! + step)
  return ticks
}

/** Path kolom dengan ujung data membulat 4px dan alas persegi di baseline. */
export function columnPath(x: number, y: number, width: number, height: number, radius = 4): string {
  if (height <= 0) return ""
  const r = Math.min(radius, width / 2, height)
  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height}`,
    "Z",
  ].join(" ")
}

export interface TooltipState {
  x: number
  y: number
  content: ReactNode
}

/** Tooltip mengambang di dalam kontainer grafik (posisi relatif terhadap kontainer). */
export function ChartTooltip({ state, containerWidth }: { state: TooltipState | null; containerWidth: number }) {
  if (!state) return null
  const alignRight = state.x > containerWidth - 160
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-[120px] rounded-md border border-black/10 bg-white px-3 py-2 text-xs shadow-lg"
      style={{
        left: alignRight ? undefined : state.x + 12,
        right: alignRight ? containerWidth - state.x + 12 : undefined,
        top: Math.max(0, state.y - 12),
      }}
    >
      {state.content}
    </div>
  )
}

/** "Lihat sebagai tabel" — padanan tabel setiap grafik (aksesibilitas & salin data). */
export function ChartTable({
  caption,
  columns,
  rows,
}: {
  caption: string
  columns: string[]
  rows: (string | number)[][]
}) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground">
        Lihat sebagai tabel
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-md border">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-muted">
            <tr>
              {columns.map((c, i) => (
                <th key={c} scope="col" className={`px-3 py-2 font-medium ${i > 0 ? "text-right" : ""}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-t">
                {row.map((cell, i) => (
                  <td key={i} className={`px-3 py-1.5 ${i > 0 ? "text-right tabular-nums" : ""}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
