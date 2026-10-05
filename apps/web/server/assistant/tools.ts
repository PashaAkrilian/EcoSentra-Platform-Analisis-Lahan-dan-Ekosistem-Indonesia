import "server-only"
import type Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import type { HotspotRange } from "@/lib/data/types"
import { formatDateTime } from "@/lib/format"
import { isInIndonesiaBbox, MAX_BUFFER_METERS, MIN_BUFFER_METERS } from "@/lib/geo"
import { provinceAreaKm2 } from "@/lib/provinces"
import { resolveProvince } from "@/lib/province-search"
import { getEarthquakes } from "@/server/sources/bmkg"
import { getHotspotDataset, summarizeHotspots } from "@/server/sources/firms"
import { analyzeLandCover } from "@/server/sources/landcover"
import { getNdviSeries } from "@/server/sources/modisNdvi"
import { getWeather } from "@/server/sources/openMeteo"
import { getProvinceLandCover } from "@/server/sources/provinceLandcover"

/**
 * Alat data langsung untuk asisten LandAI. Dipakai oleh dua mode:
 * - mode Claude: didefinisikan sebagai tool use (anthropicTools) dan dijalankan lewat runTool;
 * - mode aturan: dipanggil langsung lewat executeTool, hasilnya diformat menjadi teks.
 * Semua alat memakai modul sumber data yang sama dengan API publik, jadi angkanya identik dengan dashboard.
 */

const MAX_RESULT_CHARS = 8000

const coordinates = {
  lat: z.number().min(-11.5).max(6.5).describe("Lintang (derajat, negatif = selatan), wilayah Indonesia"),
  lng: z.number().min(94.5).max(141.5).describe("Bujur (derajat, timur positif), wilayah Indonesia"),
}

const provinceArg = z.string().trim().min(2).max(60).describe("Nama provinsi, mis. 'Kalimantan Tengah' atau 'Kalteng'")

interface ToolDef<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string
  /** Label ramah-pengguna untuk status "sedang memanggil alat". */
  label: string
  description: string
  schema: S
  inputSchema: Anthropic.Tool["input_schema"]
  run: (input: z.infer<S>) => Promise<unknown>
}

function defineTool<S extends z.ZodTypeAny>(def: ToolDef<S>): ToolDef<S> {
  return def
}

function requireProvince(name: string) {
  const province = resolveProvince(name)
  if (!province) {
    throw new Error(`Provinsi "${name}" tidak dikenali. Gunakan nama provinsi di Indonesia, mis. "Riau" atau "Jawa Timur".`)
  }
  return province
}

function requireIndonesia(lat: number, lng: number) {
  if (!isInIndonesiaBbox(lat, lng)) throw new Error("Koordinat berada di luar wilayah Indonesia.")
}

const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits

export const TOOLS = [
  defineTool({
    name: "get_fire_hotspots",
    label: "Mengambil data titik api",
    description:
      "Jumlah titik api (anomali panas satelit NASA FIRMS VIIRS 375 m) di daratan Indonesia, secara nasional atau per provinsi, " +
      "dengan rincian provinsi teratas dan jumlah per hari (7 hari). Titik api BUKAN kebakaran terverifikasi. Data hampir real-time.",
    schema: z.object({
      province: provinceArg.optional(),
      range: z.enum(["24h", "48h", "7d"]).default("24h").describe("Rentang waktu, default 24 jam"),
    }),
    inputSchema: {
      type: "object",
      properties: {
        province: { type: "string", description: "Nama provinsi (opsional). Kosongkan untuk seluruh Indonesia." },
        range: { type: "string", enum: ["24h", "48h", "7d"], description: "Rentang waktu: 24h (default), 48h, atau 7d" },
      },
    },
    async run({ province, range }) {
      const resolved = province ? requireProvince(province) : null
      const dataset = await getHotspotDataset(range as HotspotRange)
      const hotspots = resolved ? dataset.hotspots.filter((h) => h.provinceIso === resolved.iso) : dataset.hotspots
      const summary = summarizeHotspots({ ...dataset, hotspots })
      const area = resolved ? provinceAreaKm2(resolved.iso) : null
      return {
        scope: resolved ? resolved.name : "Seluruh Indonesia",
        range,
        total: summary.total,
        highConfidence: summary.highConfidence,
        latestDetection: summary.latestAcquiredAt ? formatDateTime(summary.latestAcquiredAt) : null,
        ...(resolved && area ? { areaKm2: area, densityPer1000Km2: round((summary.total / area) * 1000, 2) } : {}),
        ...(!resolved
          ? { topProvinces: summary.byProvince.slice(0, 8).map((p) => ({ name: p.name, count: p.count, highConfidence: p.highConfidence })) }
          : {}),
        dailyCountsWib: summary.byDay.map((d, i, all) => ({
          date: d.date,
          count: d.count,
          ...(all.length >= 3 && (i === 0 || i === all.length - 1) ? { partialDay: true } : {}),
        })),
        satellite: summary.source.satellite,
        source: "NASA FIRMS",
        fetchedAt: formatDateTime(summary.source.fetchedAt),
        note: "Titik api = anomali panas, bukan kebakaran terverifikasi.",
      }
    },
  }),

  defineTool({
    name: "get_earthquakes",
    label: "Mengambil data gempa BMKG",
    description:
      "Gempa bumi terbaru dari BMKG: M 5.0+ terbaru (dengan info potensi tsunami) dan/atau gempa yang dirasakan. Urut dari yang terbaru.",
    schema: z.object({
      kind: z.enum(["m5", "felt"]).default("m5").describe("'m5' = gempa M 5+ terbaru, 'felt' = gempa terbaru yang dirasakan warga"),
      limit: z.number().int().min(1).max(10).default(5),
    }),
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["m5", "felt"], description: "m5 (default) atau felt" },
        limit: { type: "integer", minimum: 1, maximum: 10, description: "Jumlah gempa (default 5)" },
      },
    },
    async run({ kind, limit }) {
      const data = await getEarthquakes()
      const list = (kind === "felt" ? data.felt : data.recent).slice(0, limit)
      return {
        kind,
        events: list.map((q) => ({
          timeWib: formatDateTime(q.occurredAt),
          magnitude: q.magnitude,
          depthKm: q.depthKm,
          region: q.region,
          coordinates: { lat: q.lat, lng: q.lng },
          tsunamiPotential: q.tsunamiPotential,
          potentialText: q.potential,
          feltMmi: q.felt,
        })),
        source: "BMKG",
        fetchedAt: formatDateTime(data.source.fetchedAt),
        note: "Bukan peringatan dini resmi; rujuk BMKG untuk keputusan keselamatan.",
      }
    },
  }),

  defineTool({
    name: "get_weather",
    label: "Mengambil data cuaca",
    description: "Cuaca terkini dan prakiraan 7 hari untuk satu koordinat di Indonesia (Open-Meteo), termasuk kelembapan tanah hasil model.",
    schema: z.object(coordinates),
    inputSchema: {
      type: "object",
      properties: { lat: { type: "number", description: coordinates.lat.description }, lng: { type: "number", description: coordinates.lng.description } },
      required: ["lat", "lng"],
    },
    async run({ lat, lng }) {
      requireIndonesia(lat, lng)
      const w = await getWeather(lat, lng)
      return {
        location: { lat: w.lat, lng: w.lng },
        nowWib: formatDateTime(w.current.time),
        current: {
          temperatureC: w.current.temperatureC,
          humidityPct: w.current.humidityPct,
          precipitationMm: w.current.precipitationMm,
          windKmh: w.current.windSpeedKmh,
          description: w.current.description,
          soilMoistureVolumetricPct: w.current.soilMoisture === null ? null : round(w.current.soilMoisture * 100, 1),
        },
        forecast: w.daily.map((d) => ({ date: d.date, description: d.description, minC: d.tempMinC, maxC: d.tempMaxC, rainMm: d.precipitationMm })),
        source: "Open-Meteo",
        note: "Kelembapan tanah adalah keluaran model, bukan pengukuran lapangan.",
      }
    },
  }),

  defineTool({
    name: "get_ndvi",
    label: "Mengambil data NDVI",
    description:
      "Deret waktu NDVI (kehijauan vegetasi) MODIS 250 m untuk satu koordinat, ±10 bulan terakhir. Observasi berawan ditandai tidak andal.",
    schema: z.object(coordinates),
    inputSchema: {
      type: "object",
      properties: { lat: { type: "number", description: coordinates.lat.description }, lng: { type: "number", description: coordinates.lng.description } },
      required: ["lat", "lng"],
    },
    async run({ lat, lng }) {
      requireIndonesia(lat, lng)
      const ndvi = await getNdviSeries(lat, lng)
      const cloudy = ndvi.observations.filter((o) => o.quality === "berawan").length
      return {
        location: { lat: ndvi.lat, lng: ndvi.lng },
        latestReliable: ndvi.latest,
        recentObservations: ndvi.observations.slice(-8),
        cloudyObservations: cloudy,
        totalObservations: ndvi.observations.length,
        source: "NASA MODIS MOD13Q1 via ORNL DAAC",
        note: "NDVI menggambarkan kehijauan, bukan langsung kesehatan tanaman. Observasi 'berawan' tidak andal.",
      }
    },
  }),

  defineTool({
    name: "get_land_cover",
    label: "Menganalisis tutupan lahan",
    description: "Komposisi tutupan lahan (persentase per kelas) dalam radius tertentu dari satu koordinat, resolusi 10 m.",
    schema: z.object({
      ...coordinates,
      buffer_meters: z.number().int().min(MIN_BUFFER_METERS).max(MAX_BUFFER_METERS).default(1000).describe("Radius analisis (meter), 100–50000"),
    }),
    inputSchema: {
      type: "object",
      properties: {
        lat: { type: "number", description: coordinates.lat.description },
        lng: { type: "number", description: coordinates.lng.description },
        buffer_meters: { type: "integer", minimum: MIN_BUFFER_METERS, maximum: MAX_BUFFER_METERS, description: "Radius meter (default 1000)" },
      },
      required: ["lat", "lng"],
    },
    async run({ lat, lng, buffer_meters }) {
      requireIndonesia(lat, lng)
      const result = await analyzeLandCover(lat, lng, buffer_meters)
      return {
        location: { lat, lng },
        bufferMeters: buffer_meters,
        areaHa: result.areaHa,
        dominantClass: result.dominantClass,
        classes: result.classes.slice(0, 7).map((c) => ({ name: c.name, percentage: c.percentage })),
        dataset: `${result.source.dataset} ${result.source.year}`,
        source: result.source.name,
        note: "Klasifikasi otomatis; 'Pepohonan' mencakup hutan alam dan kebun berpohon.",
      }
    },
  }),

  defineTool({
    name: "get_province_land_cover",
    label: "Menghitung tutupan lahan provinsi",
    description: "Komposisi tutupan lahan seluruh provinsi (persentase luas per kelas) beserta luas wilayahnya.",
    schema: z.object({ province: provinceArg }),
    inputSchema: {
      type: "object",
      properties: { province: { type: "string", description: "Nama provinsi, mis. 'Kalimantan Tengah'" } },
      required: ["province"],
    },
    async run({ province }) {
      const resolved = requireProvince(province)
      const result = await getProvinceLandCover(resolved.iso)
      return {
        province: result.name,
        areaKm2: result.areaKm2,
        classes: result.classes.slice(0, 8).map((c) => ({ name: c.name, percentage: c.percentage })),
        dataset: `${result.source.dataset} ${result.source.year}`,
        source: result.source.name,
        note: `Dihitung dari sampel piksel ±${result.source.sampleResolutionM} m; dapat berbeda dari data resmi KLHK.`,
      }
    },
  }),
] as const

export type ToolName = (typeof TOOLS)[number]["name"]

const BY_NAME = new Map<string, (typeof TOOLS)[number]>(TOOLS.map((t) => [t.name, t]))

/** Definisi alat untuk parameter `tools` Anthropic Messages API. */
export function anthropicTools(): Anthropic.Tool[] {
  return TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }))
}

export function toolLabel(name: string): string {
  return BY_NAME.get(name)?.label ?? name
}

/** Jalankan alat dengan validasi input; mengembalikan objek hasil (melempar kalau input/sumber bermasalah). */
export async function executeTool(name: string, input: unknown): Promise<unknown> {
  const tool = BY_NAME.get(name)
  if (!tool) throw new Error(`Alat tidak dikenal: ${name}`)
  const parsed = tool.schema.safeParse(input ?? {})
  if (!parsed.success) {
    throw new Error(`Input tidak valid: ${parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ")}`)
  }
  return tool.run(parsed.data as never)
}

/** Untuk tool_result: JSON ringkas (dipotong kalau terlalu panjang) + penanda galat. */
export async function runTool(name: string, input: unknown): Promise<{ content: string; isError: boolean }> {
  try {
    const result = await executeTool(name, input)
    const json = JSON.stringify(result)
    return {
      content: json.length > MAX_RESULT_CHARS ? `${json.slice(0, MAX_RESULT_CHARS)}…[dipotong]` : json,
      isError: false,
    }
  } catch (error) {
    return { content: JSON.stringify({ error: error instanceof Error ? error.message : "Alat gagal dijalankan." }), isError: true }
  }
}

