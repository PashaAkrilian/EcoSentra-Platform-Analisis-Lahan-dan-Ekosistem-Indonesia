"use client"

import { useState, type ReactNode } from "react"
import { formatNumber } from "@/lib/format"

export interface BarListItem {
  key: string
  label: string
  value: number
  /** Info tambahan di tooltip (mis. jumlah keyakinan tinggi). */
  detail?: ReactNode
}

/**
 * Bar horizontal satu seri untuk membandingkan besaran antar kategori nominal
 * (mis. provinsi). Nilai tercetak di ujung bar; detail tambahan muncul saat
 * hover/fokus. Semua bar satu warna — panjang bar sudah mengodekan besaran.
 */
export function BarList({ items, color, ariaLabel }: { items: BarListItem[]; color: string; ariaLabel: string }) {
  const [active, setActive] = useState<string | null>(null)
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <ul aria-label={ariaLabel} className="space-y-1.5" onPointerLeave={() => setActive(null)}>
      {items.map((item) => {
        const isActive = active === item.key
        return (
          <li
            key={item.key}
            tabIndex={0}
            onPointerEnter={() => setActive(item.key)}
            onFocus={() => setActive(item.key)}
            onBlur={() => setActive(null)}
            className="group relative grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 rounded-md px-1 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,11rem)_1fr]"
          >
            <span className="truncate text-sm text-foreground" title={item.label}>
              {item.label}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 rounded-r-[4px] transition-opacity"
                style={{
                  width: `${Math.max(1, (item.value / max) * 100)}%`,
                  maxWidth: "calc(100% - 3.5rem)",
                  backgroundColor: color,
                  opacity: active && !isActive ? 0.55 : 1,
                }}
                aria-hidden
              />
              <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">{formatNumber(item.value)}</span>
            </span>
            {isActive && item.detail && (
              <span
                role="status"
                className="pointer-events-none absolute right-0 top-full z-10 mt-1 rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs shadow-lg"
              >
                {item.detail}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
