"use client"

import { useState } from "react"
import type { NdviObservation } from "@/lib/data/types"
import { formatDate } from "@/lib/format"
import { CHART_CHROME, ChartTable, ChartTooltip, ENTITY_COLORS, useElementWidth, type TooltipState } from "@/components/charts/chart-utils"

const MARGIN = { top: 12, right: 12, bottom: 26, left: 36 }
const Y_TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1]

/**
 * Deret waktu NDVI MODIS: observasi andal (baik/marginal) dihubungkan garis
 * hijau; observasi berawan digambar sebagai titik abu-abu berongga, tidak
 * disambung — nilainya tertekan awan, bukan kondisi vegetasi sebenarnya.
 * Crosshair menempel ke tanggal terdekat.
 */
export function NdviChart({ observations, height = 200 }: { observations: NdviObservation[]; height?: number }) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (observations.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada observasi NDVI untuk titik ini.</p>
  }

  const times = observations.map((o) => Date.parse(`${o.date}T00:00:00Z`))
  const t0 = Math.min(...times)
  const t1 = Math.max(...times)
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const plotHeight = height - MARGIN.top - MARGIN.bottom
  const yMin = Math.min(0, ...observations.map((o) => o.ndvi))
  const x = (t: number) => MARGIN.left + (t1 === t0 ? plotWidth / 2 : ((t - t0) / (t1 - t0)) * plotWidth)
  const y = (v: number) => MARGIN.top + (1 - (v - yMin) / (1 - yMin)) * plotHeight

  const reliable = observations
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => o.quality === "baik" || o.quality === "marginal")
  const linePoints = reliable.map(({ i, o }) => `${x(times[i]!)},${y(o.ndvi)}`).join(" ")

  const xTicks = [0, Math.floor((observations.length - 1) / 2), observations.length - 1]
    .filter((v, i, arr) => arr.indexOf(v) === i)

  const nearestIndex = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left
    let best = 0
    times.forEach((t, i) => {
      if (Math.abs(x(t) - px) < Math.abs(x(times[best]!) - px)) best = i
    })
    return best
  }

  const hovered = hoverIndex !== null ? observations[hoverIndex] : null
  const tooltip: TooltipState | null =
    hovered && hoverIndex !== null
      ? {
          x: x(times[hoverIndex]!),
          y: y(hovered.ndvi),
          content: (
            <>
              <div className="text-sm font-semibold text-foreground">NDVI {hovered.ndvi.toFixed(2)}</div>
              <div className="text-muted-foreground">Komposit {formatDate(hovered.date)}</div>
              <div className="text-muted-foreground">Kualitas: {hovered.quality}</div>
            </>
          ),
        }
      : null

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: ENTITY_COLORS.vegetation }} />
          NDVI (observasi andal)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: ENTITY_COLORS.muted }} />
          Berawan — tidak andal
        </span>
      </div>
      <div ref={containerRef} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`Grafik NDVI ${observations.length} komposit 16 hari`}
            tabIndex={0}
            className="outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onPointerMove={(e) => setHoverIndex(nearestIndex(e.clientX, e.currentTarget.getBoundingClientRect()))}
            onPointerLeave={() => setHoverIndex(null)}
            onFocus={() => setHoverIndex(observations.length - 1)}
            onBlur={() => setHoverIndex(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setHoverIndex((i) => Math.max(0, (i ?? 0) - 1))
              if (e.key === "ArrowRight") setHoverIndex((i) => Math.min(observations.length - 1, (i ?? 0) + 1))
            }}
          >
            {Y_TICKS.filter((t) => t >= yMin).map((t) => (
              <g key={t}>
                <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? CHART_CHROME.axis : CHART_CHROME.grid} />
                <text x={MARGIN.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={CHART_CHROME.mutedInk}>
                  {t.toFixed(1)}
                </text>
              </g>
            ))}
            {xTicks.map((i) => (
              <text
                key={i}
                x={x(times[i]!)}
                y={height - 8}
                textAnchor={i === 0 ? "start" : i === observations.length - 1 ? "end" : "middle"}
                fontSize={11}
                fill={CHART_CHROME.mutedInk}
              >
                {formatDate(observations[i]!.date)}
              </text>
            ))}

            {hoverIndex !== null && (
              <line
                x1={x(times[hoverIndex]!)}
                x2={x(times[hoverIndex]!)}
                y1={MARGIN.top}
                y2={MARGIN.top + plotHeight}
                stroke={CHART_CHROME.axis}
              />
            )}

            {reliable.length > 1 && (
              <polyline
                points={linePoints}
                fill="none"
                stroke={ENTITY_COLORS.vegetation}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {observations.map((o, i) => {
              const ok = o.quality === "baik" || o.quality === "marginal"
              return (
                <circle
                  key={o.date}
                  cx={x(times[i]!)}
                  cy={y(o.ndvi)}
                  r={hoverIndex === i ? 5 : 4}
                  fill={ok ? ENTITY_COLORS.vegetation : "#fff"}
                  stroke={ok ? "#fff" : ENTITY_COLORS.muted}
                  strokeWidth={2}
                />
              )
            })}
          </svg>
        )}
        <ChartTooltip state={tooltip} containerWidth={width} />
      </div>
      <ChartTable
        caption="Deret waktu NDVI"
        columns={["Tanggal komposit", "NDVI", "Kualitas"]}
        rows={observations.map((o) => [formatDate(o.date), o.ndvi.toFixed(3), o.quality])}
      />
    </div>
  )
}
