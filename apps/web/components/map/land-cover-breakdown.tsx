import type { LandCoverResult } from "@/lib/data/types"
import { formatNumber } from "@/lib/format"

/**
 * Komposisi tutupan lahan: bar bertumpuk (jeda 2px antar-segmen, warna resmi
 * legenda dataset) + daftar kelas sebagai legenda sekaligus tabel nilai —
 * label tidak ditulis di dalam segmen karena segmen kecil tidak muat.
 */
export function LandCoverBreakdown({ classes, ariaLabel }: { classes: LandCoverResult["classes"]; ariaLabel: string }) {
  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-[4px]" role="img" aria-label={ariaLabel}>
        {classes.map((c) => (
          <div
            key={c.code}
            className="h-full first:rounded-l-[4px] last:rounded-r-[4px]"
            style={{ width: `${c.percentage}%`, backgroundColor: c.color, minWidth: c.percentage > 0 ? 2 : 0 }}
            title={`${c.name}: ${formatNumber(c.percentage, 1)}%`}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {classes.map((c) => (
          <li key={c.code} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: c.color }} aria-hidden />
              <span className="truncate">{c.name}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{formatNumber(c.percentage, 1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
