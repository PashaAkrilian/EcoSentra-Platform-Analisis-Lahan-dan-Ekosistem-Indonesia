import { ENTITY_COLORS } from "@/components/charts/chart-utils"

/** Sparkline tren kecil untuk stat tile: garis abu-abu, titik terakhir berwarna aksen. */
export function Sparkline({
  values,
  accent,
  width = 96,
  height = 28,
  label,
}: {
  values: number[]
  accent: string
  width?: number
  height?: number
  label: string
}) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const pad = 4
  const points = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (width - pad * 2),
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ])
  const [lastX, lastY] = points.at(-1)!

  return (
    <svg width={width} height={height} role="img" aria-label={label} className="shrink-0">
      <polyline
        points={points.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke={ENTITY_COLORS.muted}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r={4} fill={accent} stroke="#fff" strokeWidth={2} />
    </svg>
  )
}
