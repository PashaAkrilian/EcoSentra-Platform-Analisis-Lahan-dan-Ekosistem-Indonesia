import { PROVINCES, type ProvinceInfo } from "@/lib/provinces"

// Singkatan & ejaan umum -> kode ISO. Kunci sudah huruf kecil tanpa tanda baca.
const ALIASES: Record<string, string> = {
  "nad": "ID-AC",
  "nangroe aceh darussalam": "ID-AC",
  "sumut": "ID-SU",
  "sumatra utara": "ID-SU",
  "sumbar": "ID-SB",
  "sumatra barat": "ID-SB",
  "sumsel": "ID-SS",
  "sumatra selatan": "ID-SS",
  "kepri": "ID-KR",
  "babel": "ID-BB",
  "bangka belitung": "ID-BB",
  "jakarta": "ID-JK",
  "dki": "ID-JK",
  "dki jakarta": "ID-JK",
  "yogyakarta": "ID-YO",
  "yogya": "ID-YO",
  "jogja": "ID-YO",
  "diy": "ID-YO",
  "jabar": "ID-JB",
  "jateng": "ID-JT",
  "jatim": "ID-JI",
  "ntb": "ID-NB",
  "ntt": "ID-NT",
  "kalbar": "ID-KB",
  "kalteng": "ID-KT",
  "kalsel": "ID-KS",
  "kaltim": "ID-KI",
  "kaltara": "ID-KU",
  "sulut": "ID-SA",
  "sulteng": "ID-ST",
  "sulsel": "ID-SN",
  "sultra": "ID-SG",
  "sulbar": "ID-SR",
  "malut": "ID-MU",
  "pabar": "ID-PB",
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(provinsi|prov)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const NEEDLES: { needle: string; iso: string }[] = [
  ...Object.values(PROVINCES).flatMap((p) => [
    { needle: normalize(p.name), iso: p.iso },
    { needle: normalize(p.iso), iso: p.iso }, // "id kt" dari "ID-KT"
  ]),
  ...Object.entries(ALIASES).map(([alias, iso]) => ({ needle: normalize(alias), iso })),
  // nama tanpa awalan "DI"/"DKI", mis. "DI Yogyakarta"
  { needle: "yogyakarta", iso: "ID-YO" },
]
  .filter((n) => n.needle.length >= 2)
  // pencocokan terpanjang dulu: "papua barat" harus menang atas "papua"
  .sort((a, b) => b.needle.length - a.needle.length)

/** Cocokkan teks bebas yang HANYA berisi nama/kode/singkatan provinsi (mis. argumen alat). */
export function resolveProvince(query: string): ProvinceInfo | null {
  const text = normalize(query)
  if (!text) return null
  const exact = NEEDLES.find((n) => n.needle === text)
  return exact ? PROVINCES[exact.iso]! : null
}

/** Cari provinsi yang disebut di dalam kalimat; pencocokan per kata utuh, terpanjang menang. */
export function findProvinceInText(sentence: string): ProvinceInfo | null {
  const text = ` ${normalize(sentence)} `
  const hit = NEEDLES.find((n) => n.needle.length >= 3 && text.includes(` ${n.needle} `))
  return hit ? PROVINCES[hit.iso]! : null
}
