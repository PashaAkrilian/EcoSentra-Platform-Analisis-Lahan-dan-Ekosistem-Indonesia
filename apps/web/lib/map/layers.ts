// Konfigurasi layer peta — data murni (tanpa Leaflet) supaya bisa diuji & dipakai UI panel.

export type BaseLayerId = "osm" | "satellite" | "topo"
export type RasterOverlayId = "landcover" | "ndvi" | "lst"

export interface TileSpec {
  url: string
  attribution: string
  maxZoom: number
  maxNativeZoom?: number
  subdomains?: string
}

export interface BaseLayerSpec extends TileSpec {
  id: BaseLayerId
  label: string
  description: string
}

export const BASE_LAYERS: BaseLayerSpec[] = [
  {
    id: "osm",
    label: "Peta jalan",
    description: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    maxZoom: 19,
  },
  {
    id: "satellite",
    label: "Citra satelit",
    description: "Esri World Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri — Esri, Maxar, Earthstar Geographics, dan komunitas GIS",
    maxZoom: 18,
  },
  {
    id: "topo",
    label: "Topografi",
    description: "OpenTopoMap",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      '© OpenStreetMap, SRTM | © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
    subdomains: "abc",
  },
]

const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best"
const GIBS_ATTRIBUTION =
  '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">NASA EOSDIS GIBS</a>'

export interface RasterOverlaySpec {
  id: RasterOverlayId
  label: string
  description: string
  opacity: number
  tile: TileSpec
  legend: LegendSpec
}

export interface LegendStop {
  value: number
  color: string
}

export type LegendSpec =
  | { kind: "gradient"; title: string; unit: string; stops: LegendStop[]; format: (value: number) => string }
  | { kind: "classes"; title: string; classes: { name: string; color: string }[] }

// Titik warna diambil dari colormap resmi GIBS (colormaps/v1.3/MODIS_NDVI.xml &
// MODIS_Land_Surface_Temp.xml), bukan gradien rekaan.
export const NDVI_STOPS: LegendStop[] = [
  { value: 0.0, color: "#f1ecec" },
  { value: 0.1, color: "#dfcec2" },
  { value: 0.2, color: "#b09b8a" },
  { value: 0.3, color: "#965a47" },
  { value: 0.4, color: "#8fb716" },
  { value: 0.5, color: "#56a100" },
  { value: 0.6, color: "#3e8a01" },
  { value: 0.7, color: "#217801" },
  { value: 0.8, color: "#086701" },
  { value: 0.9, color: "#005401" },
  { value: 1.0, color: "#001801" },
]

export const LST_STOPS: LegendStop[] = [
  { value: 270, color: "#45ff5e" },
  { value: 280, color: "#83ff00" },
  { value: 290, color: "#bdff00" },
  { value: 300, color: "#ffff00" },
  { value: 310, color: "#ffcd00" },
  { value: 320, color: "#ff9d00" },
  { value: 330, color: "#ff6700" },
  { value: 340, color: "#ff3400" },
]

/** Legenda kelas Esri/Impact Observatory 10 m LULC (warna resmi dataset). */
export const ESRI_LEGEND_CLASSES = [
  { name: "Badan air", color: "#419bdf" },
  { name: "Pepohonan", color: "#397d49" },
  { name: "Vegetasi tergenang", color: "#7a87c6" },
  { name: "Tanaman pertanian", color: "#e49635" },
  { name: "Area terbangun", color: "#c4281b" },
  { name: "Lahan terbuka", color: "#a59b8f" },
  { name: "Padang rumput / semak", color: "#e3e2c3" },
]

export const RASTER_OVERLAYS: RasterOverlaySpec[] = [
  {
    id: "landcover",
    label: "Tutupan lahan 10 m",
    description: "Esri / Impact Observatory — klasifikasi Sentinel-2 tahunan",
    opacity: 0.75,
    // URL dibangun oleh buildLandCoverTileUrl (ImageServer exportImage), bukan template XYZ.
    tile: {
      url: "",
      attribution: 'Land cover © <a href="https://livingatlas.arcgis.com/landcover/" target="_blank" rel="noopener">Esri, Impact Observatory</a>',
      maxZoom: 18,
      maxNativeZoom: 14,
    },
    legend: { kind: "classes", title: "Kelas tutupan lahan", classes: ESRI_LEGEND_CLASSES },
  },
  {
    id: "ndvi",
    label: "Indeks vegetasi (NDVI)",
    description: "NASA MODIS Terra, komposit 8 hari, 250 m",
    opacity: 0.8,
    tile: {
      url: `${GIBS}/MODIS_Terra_NDVI_8Day/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
      attribution: GIBS_ATTRIBUTION,
      maxZoom: 18,
      maxNativeZoom: 9,
    },
    legend: {
      kind: "gradient",
      title: "NDVI",
      unit: "",
      stops: NDVI_STOPS,
      format: (v) => v.toFixed(1),
    },
  },
  {
    id: "lst",
    label: "Suhu permukaan tanah",
    description: "NASA MODIS Terra, siang hari, komposit 8 hari, 1 km",
    opacity: 0.8,
    tile: {
      url: `${GIBS}/MODIS_Terra_L3_Land_Surface_Temp_8Day_Day/default/default/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`,
      attribution: GIBS_ATTRIBUTION,
      maxZoom: 18,
      maxNativeZoom: 7,
    },
    legend: {
      kind: "gradient",
      title: "Suhu permukaan",
      unit: "°C",
      stops: LST_STOPS,
      format: (kelvin) => String(Math.round(kelvin - 273.15)),
    },
  },
]

// --- Tile Esri ImageServer (exportImage) -------------------------------------

const EARTH_RADIUS = 6378137
const ESRI_IMAGE_SERVER = "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer"

/** Bounding box (EPSG:3857, meter) dari koordinat tile XYZ. */
export function tileBboxMercator(z: number, x: number, y: number): [number, number, number, number] {
  const size = (2 * Math.PI * EARTH_RADIUS) / 2 ** z
  const origin = Math.PI * EARTH_RADIUS
  return [-origin + x * size, origin - (y + 1) * size, -origin + (x + 1) * size, origin - y * size]
}

export function buildLandCoverTileUrl(z: number, x: number, y: number, year: number, tileSize = 256): string {
  const params = new URLSearchParams({
    bbox: tileBboxMercator(z, x, y)
      .map((v) => v.toFixed(3))
      .join(","),
    bboxSR: "3857",
    imageSR: "3857",
    size: `${tileSize},${tileSize}`,
    format: "png",
    f: "image",
    time: `${Date.UTC(year, 0, 1)},${Date.UTC(year, 11, 31, 23, 59, 59)}`,
    interpolation: "RSP_NearestNeighbor",
  })
  return `${ESRI_IMAGE_SERVER}/exportImage?${params}`
}

// --- Titik api: gaya penanda --------------------------------------------------

/** Rampa satu-hue oranye: makin gelap = makin yakin itu kebakaran (confidence VIIRS). */
export const FIRE_CONFIDENCE_COLORS = ["#f5b895", "#eb6834", "#a8340d"] as const
export const FIRE_CONFIDENCE_LABELS = ["Rendah", "Nominal", "Tinggi"] as const

/** Radius penanda dari Fire Radiative Power (MW): 3 – 9 px. */
export function fireRadius(frpMw: number): number {
  return Math.min(9, Math.max(3, 2.5 + Math.sqrt(Math.max(0, frpMw)) * 0.8))
}

/** Radius penanda gempa dari magnitudo: M5 -> 8 px, M7 -> 16 px. */
export function quakeRadius(magnitude: number): number {
  return Math.min(22, Math.max(6, 8 + (magnitude - 5) * 4))
}
