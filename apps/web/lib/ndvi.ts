export type VegetationLevel = "none" | "sparse" | "moderate" | "dense" | "very-dense"

/**
 * Interpretasi kasar nilai NDVI MODIS untuk pembaca awam. Ambang ini
 * indikatif (kelas umum yang dipakai di literatur penginderaan jauh) —
 * tiap ekosistem punya rentang berbeda, jadi jangan dipakai sebagai
 * diagnosis kesehatan tanaman tanpa data pembanding lokal.
 */
export function describeNdvi(ndvi: number): { level: VegetationLevel; label: string } {
  if (ndvi < 0.1) return { level: "none", label: "Hampir tanpa vegetasi (tanah terbuka, air, atau bangunan)" }
  if (ndvi < 0.3) return { level: "sparse", label: "Vegetasi jarang atau lahan terbuka" }
  if (ndvi < 0.5) return { level: "moderate", label: "Vegetasi sedang (semak, tanaman muda, atau lahan pertanian)" }
  if (ndvi < 0.7) return { level: "dense", label: "Vegetasi lebat" }
  return { level: "very-dense", label: "Vegetasi sangat lebat (mis. hutan tropis rapat)" }
}

/** Selisih NDVI terbaru vs observasi andal sebelumnya, untuk teks tren. */
export function ndviTrend(values: number[]): { delta: number; direction: "naik" | "turun" | "stabil" } | null {
  if (values.length < 2) return null
  const delta = Math.round((values.at(-1)! - values.at(-2)!) * 1000) / 1000
  const direction = Math.abs(delta) < 0.03 ? "stabil" : delta > 0 ? "naik" : "turun"
  return { delta, direction }
}
