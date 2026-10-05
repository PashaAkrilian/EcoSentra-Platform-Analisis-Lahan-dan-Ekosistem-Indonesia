import "server-only"
import { cached } from "@/server/cache"
import { listProvinces, provincePolygons } from "@/server/geo/indonesia"
import { ESRI_LULC_CLASSES, esriHistogramToCounts, latestEsriYear, toClasses } from "@/server/sources/landcover"
import type { ProvinceLandCover } from "@/lib/data/types"

/**
 * Komposisi tutupan lahan satu provinsi: histogram kelas Esri 10 m Land Cover
 * di dalam poligon provinsi (computeHistograms lewat POST, karena poligon
 * terlalu besar untuk URL). Raster di-sampel pada resolusi kasar (250 m –
 * 1 km, menyesuaikan luas provinsi) supaya satu request tetap < 4000 px per
 * sisi — secara statistik cukup untuk proporsi tingkat provinsi.
 */
const ESRI_IMAGE_SERVER = "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer"
const MAX_IMAGE_PX = 3000
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // peta tahunan; data provinsi tidak perlu sering dihitung ulang
const FETCH_TIMEOUT_MS = 90_000

/** Resolusi sampel (m): terkecil 250 m, dibulatkan ke atas ke kelipatan 50 m agar muat ≤ 3000 px. */
export function sampleResolutionM(bbox: [number, number, number, number]): number {
  const [minLng, minLat, maxLng, maxLat] = bbox
  const midLat = (minLat + maxLat) / 2
  const widthKm = (maxLng - minLng) * 111.32 * Math.cos((midLat * Math.PI) / 180)
  const heightKm = (maxLat - minLat) * 111.32
  const needed = (Math.max(widthKm, heightKm) * 1000) / MAX_IMAGE_PX
  return Math.max(250, Math.ceil(needed / 50) * 50)
}

export class UnknownProvinceError extends Error {
  constructor(iso: string) {
    super(`Provinsi tidak dikenal: ${iso}`)
    this.name = "UnknownProvinceError"
  }
}

export async function getProvinceLandCover(iso: string): Promise<ProvinceLandCover> {
  const province = listProvinces().find((p) => p.iso === iso)
  const polygons = provincePolygons(iso)
  if (!province || !polygons) throw new UnknownProvinceError(iso)

  return cached(`province-lulc:${iso}`, CACHE_TTL_MS, async () => {
    const year = await latestEsriYear()
    const rings = polygons.flat() // semua ring (luar & lubang) — Esri memakai aturan even-odd
    const lngs = rings.flat().map(([lng]) => lng!)
    const lats = rings.flat().map(([, lat]) => lat!)
    const pixelM = sampleResolutionM([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)])

    const body = new URLSearchParams({
      geometry: JSON.stringify({ rings, spatialReference: { wkid: 4326 } }),
      geometryType: "esriGeometryPolygon",
      time: `${Date.UTC(year, 0, 1)},${Date.UTC(year, 11, 31, 23, 59, 59)}`,
      pixelSize: JSON.stringify({ x: pixelM, y: pixelM, spatialReference: { wkid: 3857 } }),
      f: "json",
    })
    const response = await fetch(`${ESRI_IMAGE_SERVER}/computeHistograms`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`Esri Land Cover mengembalikan status ${response.status}`)

    const classes = toClasses(esriHistogramToCounts(await response.json()), ESRI_LULC_CLASSES)
    if (classes.length === 0) throw new Error("Tidak ada data tutupan lahan untuk provinsi ini.")

    return {
      source: {
        name: "Esri | Impact Observatory",
        url: "https://livingatlas.arcgis.com/landcover/",
        dataset: "Sentinel-2 10m Land Use/Land Cover",
        year,
        sampleResolutionM: pixelM,
        fetchedAt: new Date().toISOString(),
      },
      iso: province.iso,
      name: province.name,
      island: province.island,
      areaKm2: province.areaKm2,
      classes,
    }
  })
}
