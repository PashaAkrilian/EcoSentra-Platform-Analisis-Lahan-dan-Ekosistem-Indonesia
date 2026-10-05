import "server-only"
import type { CompactHotspot, FireHotspot } from "@/lib/data/types"

const CONFIDENCE_CODE = { low: 0, nominal: 1, high: 2 } as const

export function toCompact(h: FireHotspot): CompactHotspot {
  return [h.lat, h.lng, h.frpMw, CONFIDENCE_CODE[h.confidence], Date.parse(h.acquiredAt) / 1000, h.provinceIso]
}

const ATTRIBUTION = "Sumber: NASA FIRMS (VIIRS 375 m). Batas provinsi: geoBoundaries (ODbL)."

export function toGeoJson(hotspots: FireHotspot[]): string {
  return JSON.stringify({
    type: "FeatureCollection",
    metadata: { attribution: ATTRIBUTION, count: hotspots.length },
    features: hotspots.map((h) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [h.lng, h.lat] },
      properties: {
        acquired_at: h.acquiredAt,
        confidence: h.confidence,
        frp_mw: h.frpMw,
        brightness_k: h.brightnessK,
        daynight: h.daynight,
        province: h.provinceName,
        province_iso: h.provinceIso,
        island: h.island,
      },
    })),
  })
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(hotspots: FireHotspot[]): string {
  const header = [
    "latitude",
    "longitude",
    "acquired_at_utc",
    "confidence",
    "frp_mw",
    "brightness_k",
    "daynight",
    "province",
    "province_iso",
    "island",
  ]
  const rows = hotspots.map((h) =>
    [h.lat, h.lng, h.acquiredAt, h.confidence, h.frpMw, h.brightnessK, h.daynight, h.provinceName, h.provinceIso, h.island]
      .map(csvCell)
      .join(","),
  )
  return [header.join(","), ...rows].join("\n") + "\n"
}

function xmlEscape(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!)
}

export function toKml(hotspots: FireHotspot[], title: string): string {
  const placemarks = hotspots
    .map(
      (h) => `    <Placemark>
      <name>${xmlEscape(`${h.provinceName} — ${h.acquiredAt}`)}</name>
      <styleUrl>#${h.confidence}</styleUrl>
      <ExtendedData>
        <Data name="confidence"><value>${h.confidence}</value></Data>
        <Data name="frp_mw"><value>${h.frpMw}</value></Data>
        <Data name="brightness_k"><value>${h.brightnessK}</value></Data>
        <Data name="province"><value>${xmlEscape(h.provinceName)}</value></Data>
      </ExtendedData>
      <Point><coordinates>${h.lng},${h.lat},0</coordinates></Point>
    </Placemark>`,
    )
    .join("\n")

  const style = (id: string, color: string) =>
    `    <Style id="${id}"><IconStyle><color>${color}</color><scale>0.6</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/firedept.png</href></Icon></IconStyle></Style>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${xmlEscape(title)}</name>
    <description>${xmlEscape(ATTRIBUTION)}</description>
${style("low", "ff7fbfff")}
${style("nominal", "ff0080ff")}
${style("high", "ff0000ff")}
${placemarks}
  </Document>
</kml>
`
}
