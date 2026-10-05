import type { ReactNode } from "react"
import { CircleAlert, ExternalLink, Info, OctagonAlert, RefreshCw, TriangleAlert, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/format"
import type { Alert } from "@/lib/data/types"
import { cn } from "@/lib/utils"

const SEVERITY_STYLES: Record<Alert["severity"], { label: string; icon: LucideIcon; className: string }> = {
  kritis: { label: "Kritis", icon: OctagonAlert, className: "bg-red-100 text-red-900 ring-red-300" },
  tinggi: { label: "Tinggi", icon: TriangleAlert, className: "bg-orange-100 text-orange-900 ring-orange-300" },
  sedang: { label: "Sedang", icon: CircleAlert, className: "bg-amber-100 text-amber-900 ring-amber-300" },
  rendah: { label: "Rendah", icon: Info, className: "bg-sky-100 text-sky-900 ring-sky-300" },
}

/** Tingkat keparahan: warna + ikon + teks, tidak pernah warna saja. */
export function SeverityBadge({ severity, className }: { severity: Alert["severity"]; className?: string }) {
  const { label, icon: Icon, className: styles } = SEVERITY_STYLES[severity]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        styles,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  )
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn("flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900", className)}
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Data tidak dapat dimuat</p>
        <p className="mt-0.5 break-words text-red-800">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-3 border-red-300 bg-white text-red-900" onClick={onRetry}>
            <RefreshCw aria-hidden /> Coba lagi
          </Button>
        )}
      </div>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-card/50 px-6 py-10 text-center">
      <Icon className="h-9 w-9 text-muted-foreground" aria-hidden />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function LoadingLines({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Memuat">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={cn("h-5", i === rows - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  )
}

/** Kartu statistik: label, nilai besar, catatan, dan (opsional) sparkline. */
export function StatTile({
  label,
  icon: Icon,
  value,
  note,
  isLoading,
  error,
  onRetry,
  trend,
  accent = "text-emerald-700 bg-emerald-100",
}: {
  label: string
  icon: LucideIcon
  value?: ReactNode
  note?: ReactNode
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  trend?: ReactNode
  accent?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-9 w-24" />
          ) : error ? (
            <div className="mt-1">
              <p className="text-sm text-red-700">Gagal memuat</p>
              {onRetry && (
                <button onClick={onRetry} className="text-xs font-medium text-emerald-800 underline underline-offset-2">
                  Coba lagi
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
              {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className={cn("rounded-lg p-2", accent)} aria-hidden>
            <Icon className="h-5 w-5" />
          </div>
          {!isLoading && !error && trend}
        </div>
      </CardContent>
    </Card>
  )
}

/** Catatan sumber data & waktu pengambilan — wajib ada di setiap tampilan data asli. */
export function SourceNote({
  name,
  url,
  fetchedAt,
  extra,
  className,
}: {
  name: string
  url?: string
  fetchedAt?: string
  extra?: ReactNode
  className?: string
}) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Sumber:{" "}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-medium text-emerald-800 underline underline-offset-2"
        >
          {name}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      ) : (
        <span className="font-medium">{name}</span>
      )}
      {fetchedAt && <> · diambil {formatDateTime(fetchedAt)}</>}
      {extra && <> · {extra}</>}
    </p>
  )
}
