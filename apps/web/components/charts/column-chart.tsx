"use client"

import { useState } from "react"
import { formatNumber } from "@/lib/format"
import {
  CHART_CHROME,
  ChartTooltip,
  columnPath,
  niceTicks,
  useElementWidth,
  type TooltipState,
} from "@/components/charts/chart-utils"

export interface ColumnDatum {
  key: string
  /** Label sumbu-x singkat. */
  label: string
  /** Label lengkap untuk tooltip. */
  fullLabel?: string
  value: number
  /** Periode belum lengkap (mis. hari berjalan) — digambar lebih pucat. */
  partial?: boolean
}

const MARGIN = { top: 22, right: 8, bottom: 26, left: 44 }

/**
 * Grafik kolom satu seri (mis. jumlah titik api per hari). Kolom maks 24px,
 * ujung data membulat, gridline hairline; label nilai hanya di kolom terakhir
 * & tertinggi; tooltip per kolom saat hover/fokus keyboard.
 */
export function ColumnChart({
  data,
  color,
  height = 220,
  ariaLabel,
  unit = "",
}: {
  data: ColumnDatum[]
  color: string
  height?: number
  ariaLabel: string
  unit?: string
}) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>()
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [active, setActive] = useState<string | null>(null)

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const plotHeight = height - MARGIN.top - MARGIN.bottom
  const ticks = niceTicks(Math.max(...data.map((d) => d.value), 1))
  const yMax = ticks.at(-1)!
  const band = data.length ? plotWidth / data.length : 0
  const barWidth = Math.min(24, band * 0.6)
  const y = (v: number) => MARGIN.top + plotHeight - (v / yMax) * plotHeight

  const maxKey = data.reduce<ColumnDatum | null>((best, d) => (!best || d.value > best.value ? d : best), null)?.key
  const lastKey = data.at(-1)?.key

  const show = (d: ColumnDatum, i: number) => {
    setActive(d.key)
    setTooltip({
      x: MARGIN.left + band * i + band / 2,
      y: y(d.value),
      content: (
        <>
          <div className="text-sm font-semibold text-foreground">
            {formatNumber(d.value)}
            {unit && <span className="font-normal text-muted-foreground"> {unit}</span>}
          </div>
          <div className="text-muted-foreground">{d.fullLabel ?? d.label}</div>
        </>
      ),
    })
  }
  const hide = () => {
    setActive(null)
    setTooltip(null)
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} onPointerLeave={hide}>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? CHART_CHROME.axis : CHART_CHROME.grid}
                strokeWidth={1}
              />
              <text x={MARGIN.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={CHART_CHROME.mutedInk} className="tabular-nums">
                {formatNumber(t)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const x = MARGIN.left + band * i + (band - barWidth) / 2
            const top = y(d.value)
            const labelled = d.key === maxKey || d.key === lastKey
            return (
              <g key={d.key}>
                <path
                  d={columnPath(x, top, barWidth, MARGIN.top + plotHeight - top)}
                  fill={color}
                  opacity={(d.partial ? 0.45 : 1) * (active && active !== d.key ? 0.6 : 1)}
                />
                {labelled && (
                  <text x={x + barWidth / 2} y={top - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="#2b2a27">
                    {formatNumber(d.value)}
                  </text>
                )}
                <text
                  x={MARGIN.left + band * i + band / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill={CHART_CHROME.mutedInk}
                >
                  {d.label}
                </text>
                {/* Area hit selebar band penuh — lebih besar dari kolomnya. */}
                <rect
                  x={MARGIN.left + band * i}
                  y={MARGIN.top}
                  width={band}
                  height={plotHeight}
                  fill="transparent"
                  tabIndex={0}
                  role="graphics-symbol"
                  aria-label={`${d.fullLabel ?? d.label}: ${formatNumber(d.value)} ${unit}`}
                  onPointerMove={() => show(d, i)}
                  onFocus={() => show(d, i)}
                  onBlur={hide}
                  className="outline-none"
                />
              </g>
            )
          })}
        </svg>
      )}
      <ChartTooltip state={tooltip} containerWidth={width} />
    </div>
  )
}
