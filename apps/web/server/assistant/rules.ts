import "server-only"
import type { LatLng } from "@/lib/data/types"
import { isInIndonesiaBbox } from "@/lib/geo"
import { describeNdvi, ndviTrend } from "@/lib/ndvi"
import { findProvinceInText } from "@/lib/province-search"
import { executeTool } from "@/server/assistant/tools"
import type { AssistantContext } from "@/server/assistant/types"

/**
 * Mode berbasis aturan: asisten tanpa model bahasa. Mengenali beberapa jenis
 * pertanyaan lewat kata kunci, memanggil alat data yang sama dengan mode
 * Claude, lalu menyusun jawaban dari data asli — tidak pernah mengarang angka.
 * Dipakai saat ANTHROPIC_API_KEY belum diisi (atau pengguna belum login).
 */

export interface RuleAnswer {
  text: string
  tools: string[]
}

type Json = Record<string, any> // hasil alat bertipe bebas; bentuknya ditentukan server/assistant/tools.ts

const RANGE_LABEL: Record<string, string> = { "24h": "24 jam terakhir", "48h": "48 jam terakhir", "7d": "7 hari terakhir" }

const EXAMPLES = [
  "Berapa titik api di Kalimantan Tengah hari ini?",
  "Provinsi mana yang titik apinya paling banyak 7 hari terakhir?",
  "Gempa terbaru apa saja?",
  "Bagaimana cuaca di titik yang saya pilih? (klik titik di halaman Peta dulu)",
  "Apa itu NDVI?",
]

const GLOSSARY: { match: RegExp; text: string }[] = [
  {
    match: /apa (itu|sih|yang dimaksud).*ndvi|ndvi (itu )?apa|arti ndvi/,
    text:
      "**NDVI** (Normalized Difference Vegetation Index) mengukur kehijauan vegetasi dari pantulan cahaya merah dan inframerah dekat satelit. " +
      "Nilainya −1 sampai 1: di bawah 0,1 hampir tanpa vegetasi, 0,3–0,5 vegetasi sedang (semak, tanaman muda), di atas 0,7 vegetasi sangat lebat (mis. hutan tropis rapat). " +
      "Di Indonesia, awan sering menekan nilai NDVI — karena itu observasi berawan ditandai tidak andal. NDVI menunjukkan kehijauan, bukan diagnosis kesehatan tanaman.",
  },
  {
    match: /apa (itu|sih|yang dimaksud).*(titik api|hotspot)|(titik api|hotspot) (itu )?apa|arti titik api/,
    text:
      "**Titik api (hotspot)** adalah piksel citra satelit (VIIRS, 375 m) yang suhunya jauh lebih panas dari sekitarnya — indikasi adanya api, tetapi **bukan kebakaran yang sudah terverifikasi**. " +
      "Satu kebakaran besar bisa menghasilkan banyak titik, dan pembakaran lahan terkontrol juga terdeteksi. Tingkat keyakinan (rendah/nominal/tinggi) adalah penilaian algoritma NASA. Awan dapat menutupi deteksi.",
  },
  {
    match: /apa (itu|sih|yang dimaksud).*(tutupan lahan|land cover)|(tutupan lahan|land cover) (itu )?apa/,
    text:
      "**Tutupan lahan** adalah jenis permukaan bumi di suatu titik: pepohonan, tanaman pertanian, area terbangun, badan air, dan seterusnya. " +
      "EcoSentra memakai klasifikasi otomatis citra Sentinel-2 10 m (Esri/Impact Observatory). Kelas “Pepohonan” mencakup hutan alam dan kebun berpohon seperti sawit; akurasinya berbeda antar-kelas dan wilayah.",
  },
]

function wantsRange(q: string): "24h" | "48h" | "7d" {
  if (/7 hari|seminggu|satu minggu|sepekan|minggu (ini|terakhir)/.test(q)) return "7d"
  if (/48 jam|2 hari|dua hari|kemarin/.test(q)) return "48h"
  return "24h"
}

/** Cari koordinat "lat, lng" di dalam kalimat (koma desimal diterima). */
export function extractCoordinates(text: string): LatLng | null {
  const match = text.match(/(-?\d{1,2}[.,]\d{2,})\s*[,;/\s]\s*(-?\d{2,3}[.,]\d{2,})/)
  if (!match) return null
  const lat = Number(match[1]!.replace(",", "."))
  const lng = Number(match[2]!.replace(",", "."))
  return isInIndonesiaBbox(lat, lng) ? { lat, lng } : null
}

const n = (value: number) => value.toLocaleString("id-ID")

async function call(name: string, input: unknown, used: string[]): Promise<Json> {
  used.push(name)
  return (await executeTool(name, input)) as Json
}

function fireText(d: Json): string {
  const lines = [
    `**Titik api — ${d.scope} (${RANGE_LABEL[d.range] ?? d.range})**`,
    `- Total **${n(d.total)}** titik, ${n(d.highConfidence)} di antaranya berkeyakinan tinggi.`,
  ]
  if (d.latestDetection) lines.push(`- Deteksi terbaru: ${d.latestDetection}.`)
  if (d.topProvinces?.length) {
    lines.push(`- Provinsi terbanyak: ${d.topProvinces.slice(0, 5).map((p: Json) => `${p.name} (${n(p.count)})`).join(", ")}.`)
  }
  if (d.densityPer1000Km2 !== undefined) {
    lines.push(`- Kepadatan: ${n(d.densityPer1000Km2)} titik per 1.000 km² (luas ${n(d.areaKm2)} km²).`)
  }
  if (d.range === "7d" && d.dailyCountsWib?.length) {
    lines.push(`- Per hari (WIB): ${d.dailyCountsWib.map((x: Json) => `${x.date.slice(5)}: ${n(x.count)}${x.partialDay ? "*" : ""}`).join(", ")} (*hari belum lengkap).`)
  }
  lines.push(`_Sumber: ${d.source}, diambil ${d.fetchedAt}. Titik api adalah anomali panas satelit, bukan kebakaran terverifikasi._`)
  return lines.join("\n")
}

function quakeText(d: Json): string {
  const lines = [`**Gempa bumi terbaru${d.kind === "felt" ? " yang dirasakan" : " (M 5.0+)"}**`]
  for (const q of d.events as Json[]) {
    const extras = [`kedalaman ${q.depthKm} km`, q.tsunamiPotential ? "BERPOTENSI TSUNAMI" : null, q.feltMmi ? `dirasakan ${q.feltMmi}` : null].filter(Boolean)
    lines.push(`- M ${q.magnitude.toFixed(1)} · ${q.region} · ${q.timeWib} · ${extras.join(" · ")}`)
  }
  lines.push(`_Sumber: ${d.source}, diambil ${d.fetchedAt}. Untuk keputusan keselamatan, rujuk peringatan resmi BMKG/BNPB._`)
  return lines.join("\n")
}

function weatherText(d: Json): string {
  const c = d.current
  const lines = [
    `**Cuaca di ${d.location.lat.toFixed(2)}, ${d.location.lng.toFixed(2)}** (${d.nowWib})`,
    `- ${c.description}, **${Math.round(c.temperatureC)}°C**, kelembapan udara ${Math.round(c.humidityPct)}%, angin ${Math.round(c.windKmh)} km/j, hujan ${c.precipitationMm} mm.`,
  ]
  if (c.soilMoistureVolumetricPct !== null) lines.push(`- Kelembapan tanah (model): ${c.soilMoistureVolumetricPct}%.`)
  lines.push(
    `- Prakiraan: ${d.forecast
      .slice(0, 4)
      .map((f: Json) => `${f.date.slice(5)} ${f.description.toLowerCase()} ${Math.round(f.minC)}–${Math.round(f.maxC)}°C, hujan ${f.rainMm} mm`)
      .join("; ")}.`,
  )
  lines.push(`_Sumber: ${d.source}. Kelembapan tanah adalah keluaran model, bukan pengukuran lapangan._`)
  return lines.join("\n")
}

function ndviText(d: Json): string {
  const latest = d.latestReliable as Json | null
  if (!latest) {
    return "Semua observasi NDVI terbaru untuk titik ini tertutup awan sehingga belum ada nilai yang andal. Coba lagi beberapa minggu lagi atau pilih titik lain."
  }
  const meaning = describeNdvi(latest.ndvi)
  const reliable = (d.recentObservations as Json[]).filter((o) => o.quality === "baik" || o.quality === "marginal").map((o) => o.ndvi as number)
  const trend = ndviTrend(reliable)
  const lines = [
    `**NDVI di ${d.location.lat.toFixed(3)}, ${d.location.lng.toFixed(3)}**`,
    `- Terbaru: **${latest.ndvi.toFixed(2)}** (komposit ${latest.date}) — ${meaning.label.toLowerCase()}.`,
  ]
  if (trend) {
    lines.push(
      trend.direction === "stabil"
        ? "- Relatif stabil dibanding komposit andal sebelumnya."
        : `- ${trend.direction === "naik" ? "Naik" : "Turun"} ${Math.abs(trend.delta).toFixed(2)} dibanding komposit andal sebelumnya.`,
    )
  }
  if (d.cloudyObservations > 0) lines.push(`- ${d.cloudyObservations} dari ${d.totalObservations} observasi berawan (tidak andal, tidak dipakai).`)
  lines.push(`_Sumber: ${d.source}. NDVI menunjukkan kehijauan, bukan diagnosis kesehatan tanaman._`)
  return lines.join("\n")
}

function landCoverText(d: Json, title: string): string {
  const classes = (d.classes as Json[]).slice(0, 5).map((c) => `${c.name} ${n(c.percentage)}%`).join(", ")
  const head =
    d.areaKm2 !== undefined
      ? `**${title}** (luas ${n(d.areaKm2)} km²)`
      : `**${title}** (radius ${n(d.bufferMeters)} m, ±${n(d.areaHa)} ha)`
  return [head, `- ${classes}.`, `_Sumber: ${d.source} — ${d.dataset}. ${d.note}_`].join("\n")
}

const locationHelp =
  "Untuk pertanyaan ini saya perlu lokasi. Klik sebuah titik di halaman **Peta & Analisis** lalu tanyakan lagi, atau tulis koordinatnya (mis. `-6.57, 107.76`)."

/** Susun jawaban dari data asli untuk pertanyaan `question`. */
export async function answerWithRules(question: string, context: AssistantContext = {}): Promise<RuleAnswer> {
  const q = question.toLowerCase()
  const used: string[] = []
  const parts: string[] = []
  const province = findProvinceInText(question)
  const location = extractCoordinates(question) ?? context.location ?? null

  try {
    const glossary = GLOSSARY.find((g) => g.match.test(q))
    if (glossary) return { text: glossary.text, tools: [] }

    const isFire = /titik api|hotspot|karhutla|kebakaran|\bapi\b/.test(q)
    const isQuake = /gempa|tsunami|earthquake/.test(q)
    const isWeather = /cuaca|hujan|suhu|panas|kelembapan|angin|prakiraan|ramalan/.test(q)
    const isNdvi = /ndvi|vegetasi|kehijauan|hijau|kesehatan (tanaman|vegetasi)/.test(q)
    const isLandCover = /tutupan lahan|land cover|landcover|penggunaan lahan|komposisi lahan/.test(q)

    if (isFire) {
      parts.push(fireText(await call("get_fire_hotspots", { province: province?.name, range: wantsRange(q) }, used)))
    }
    if (isQuake) {
      parts.push(quakeText(await call("get_earthquakes", { kind: /dirasakan|terasa/.test(q) ? "felt" : "m5", limit: 5 }, used)))
    }
    if (isWeather) {
      parts.push(
        location
          ? weatherText(await call("get_weather", location, used))
          : locationHelp,
      )
    }
    if (isNdvi) {
      parts.push(location ? ndviText(await call("get_ndvi", location, used)) : locationHelp)
    }
    if (isLandCover) {
      if (province && !extractCoordinates(question)) {
        parts.push(landCoverText(await call("get_province_land_cover", { province: province.name }, used), `Tutupan lahan ${province.name}`))
      } else if (location) {
        parts.push(landCoverText(await call("get_land_cover", { ...location, buffer_meters: 1000 }, used), "Tutupan lahan di titik terpilih"))
      } else {
        parts.push(locationHelp)
      }
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "kesalahan tidak dikenal"
    return { text: `Maaf, data yang diperlukan belum bisa diambil saat ini (${reason}). Coba lagi sebentar lagi.`, tools: used }
  }

  if (parts.length > 0) return { text: parts.join("\n\n"), tools: used }

  const greeting = /^(halo|hai|hi|hello|selamat (pagi|siang|sore|malam)|assalamualaikum)\b/.test(q.trim())
  const lead = greeting ? "Halo! Saya LandAI, asisten EcoSentra." : "Saya belum memahami pertanyaan itu."
  return {
    text: [
      `${lead} Saat ini saya berjalan dalam **mode berbasis aturan** (asisten AI penuh belum diaktifkan), jadi saya paling baik menjawab pertanyaan seperti:`,
      ...EXAMPLES.map((e) => `- ${e}`),
      "Semua angka diambil langsung dari NASA FIRMS, BMKG, Open-Meteo, MODIS, dan Esri Land Cover.",
    ].join("\n"),
    tools: [],
  }
}

