import { FIRE_CONFIDENCE_COLORS, FIRE_CONFIDENCE_LABELS, RASTER_OVERLAYS, type RasterOverlayId } from "@/lib/map/layers"

function GradientLegend({ legend }: { legend: Extract<(typeof RASTER_OVERLAYS)[number]["legend"], { kind: "gradient" }> }) {
  const { stops } = legend
  const first = stops[0]!
  const last = stops.at(-1)!
  const mid = stops[Math.floor(stops.length / 2)]!
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium text-gray-700">
        {legend.title}
        {legend.unit && ` (${legend.unit})`}
      </div>
      <div
        className="h-2.5 w-44 rounded-sm"
        style={{ background: `linear-gradient(to right, ${stops.map((s) => s.color).join(", ")})` }}
        role="img"
        aria-label={`Gradien ${legend.title} dari ${legend.format(first.value)} sampai ${legend.format(last.value)}`}
      />
      <div className="mt-0.5 flex w-44 justify-between text-[10px] text-gray-600">
        <span>{legend.format(first.value)}</span>
        <span>{legend.format(mid.value)}</span>
        <span>{legend.format(last.value)}</span>
      </div>
    </div>
  )
}

/** Legenda mengambang di peta: hanya menampilkan layer yang sedang aktif. */
export function MapLegend({
  rasters,
  showFires,
  showQuakes,
}: {
  rasters: Record<RasterOverlayId, boolean>
  showFires: boolean
  showQuakes: boolean
}) {
  const activeRasters = RASTER_OVERLAYS.filter((o) => rasters[o.id])
  if (!showFires && !showQuakes && activeRasters.length === 0) return null

  return (
    <details
      open
      className="absolute bottom-10 left-3 z-[500] max-h-[55%] max-w-[16rem] overflow-y-auto rounded-lg border border-black/10 bg-white/95 p-3 text-xs shadow-md backdrop-blur"
    >
      <summary className="cursor-pointer select-none text-xs font-semibold text-gray-900">Legenda</summary>
      <div className="mt-2 space-y-3">
        {showFires && (
          <div>
            <div className="mb-1 text-[11px] font-medium text-gray-700">Titik api (keyakinan satelit)</div>
            <ul className="space-y-0.5">
              {FIRE_CONFIDENCE_LABELS.map((label, i) => (
                <li key={label} className="flex items-center gap-2 text-[11px] text-gray-700">
                  <span
                    className="inline-block h-3 w-3 rounded-full ring-1 ring-white"
                    style={{ backgroundColor: FIRE_CONFIDENCE_COLORS[i] }}
                  />
                  {label}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[10px] text-gray-500">Ukuran = daya radiatif api (FRP)</p>
          </div>
        )}
        {showQuakes && (
          <div>
            <div className="mb-1 text-[11px] font-medium text-gray-700">Gempa bumi M 5+</div>
            <div className="flex items-center gap-2 text-[11px] text-gray-700">
              <span className="inline-block h-3.5 w-3.5 rounded-full bg-[#4a3aa7]/60 ring-2 ring-white" />
              Ukuran = magnitudo
            </div>
          </div>
        )}
        {activeRasters.map((overlay) =>
          overlay.legend.kind === "gradient" ? (
            <GradientLegend key={overlay.id} legend={overlay.legend} />
          ) : (
            <div key={overlay.id}>
              <div className="mb-1 text-[11px] font-medium text-gray-700">{overlay.legend.title}</div>
              <ul className="space-y-0.5">
                {overlay.legend.classes.map((c) => (
                  <li key={c.name} className="flex items-center gap-2 text-[11px] text-gray-700">
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </li>
                ))}
              </ul>
            </div>
          ),
        )}
      </div>
    </details>
  )
}
