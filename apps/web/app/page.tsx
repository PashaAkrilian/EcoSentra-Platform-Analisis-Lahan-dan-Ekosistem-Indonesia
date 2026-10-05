import type { Metadata } from "next"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Database,
  LayoutDashboard,
  Leaf,
  Map,
  MapPin,
  Scale,
  ShieldCheck,
  Target,
  TreePine,
} from "lucide-react"
import { AssistantProvider } from "@/components/assistant-context"
import { AskLandAI } from "@/components/ask-land-ai"
import { LiveStrip } from "@/components/landing/live-strip"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: { absolute: "EcoSentra — Analisis Lahan & Ekosistem Indonesia" },
}

const REPO_URL = "https://github.com/PashaAkrilian/EcoSentra-Platform-Analisis-Lahan-dan-Ekosistem-Indonesia"

const FEATURES = [
  {
    href: "/maps",
    icon: Map,
    title: "Peta & Analisis",
    text: "Titik api, gempa, NDVI, suhu permukaan, dan tutupan lahan 10 m dalam satu peta. Klik titik mana pun untuk analisis lengkapnya, lalu ekspor ke GeoJSON, CSV, atau KML.",
    color: "from-emerald-600 to-teal-700",
  },
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    text: "Ringkasan 24 jam dan tren 7 hari: jumlah titik api per provinsi, gempa terbaru, dan peringatan aktif.",
    color: "from-sky-600 to-blue-700",
  },
  {
    href: "/disaster-alerts",
    icon: AlertTriangle,
    title: "Peringatan Bencana",
    text: "Peringatan otomatis dari gempa BMKG dan klaster titik api, ditambah peringatan kurasi admin — dengan metodologi yang terbuka.",
    color: "from-red-600 to-orange-600",
  },
  {
    href: "/ecosystem",
    icon: TreePine,
    title: "Profil Ekosistem",
    text: "Komposisi tutupan lahan dan kepadatan titik api untuk 34 provinsi, dihitung langsung dari citra satelit.",
    color: "from-teal-600 to-cyan-700",
  },
  {
    href: "/fields",
    icon: MapPin,
    title: "Lahan Saya",
    text: "Simpan lokasi kebun atau sawah dan pantau tutupan lahan, vegetasi, cuaca, serta titik api di sekitarnya.",
    color: "from-lime-600 to-green-700",
  },
  {
    href: "/decision-support",
    icon: Target,
    title: "Pendukung Keputusan",
    text: "Catat skenario pengelolaan lahan; yang punya lokasi mendapat konteks data terkini dan rekomendasi indikatif.",
    color: "from-violet-600 to-indigo-700",
  },
]

const SOURCES = [
  ["NASA FIRMS", "titik api VIIRS 375 m"],
  ["BMKG", "gempa bumi"],
  ["Esri / Impact Observatory", "tutupan lahan Sentinel-2 10 m"],
  ["NASA MODIS", "NDVI & suhu permukaan"],
  ["Open-Meteo", "cuaca & kelembapan tanah"],
]

export default function Home() {
  return (
    <AssistantProvider>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5" aria-label="EcoSentra — beranda">
            <span className="rounded-lg bg-emerald-700 p-1.5">
              <Leaf className="h-5 w-5 text-white" aria-hidden />
            </span>
            <span className="text-lg font-bold tracking-tight text-emerald-950">EcoSentra</span>
          </Link>
          <nav aria-label="Navigasi beranda" className="flex items-center gap-1 text-sm sm:gap-3">
            <Link href="/help" className="hidden rounded-md px-3 py-2 font-medium text-emerald-900 hover:bg-emerald-100 sm:inline">
              Metodologi
            </Link>
            <Link href="/login" className="rounded-md px-3 py-2 font-medium text-emerald-900 hover:bg-emerald-100">
              Masuk
            </Link>
            <Button asChild>
              <Link href="/dashboard">Buka aplikasi</Link>
            </Button>
          </nav>
        </header>

        <main>
          <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 text-center sm:pt-20">
            <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
              <Database className="h-3.5 w-3.5" aria-hidden /> Data satelit & lembaga resmi · terbuka · diambil langsung
            </p>
            <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
              Pantau lahan dan ekosistem Indonesia dari data satelit terbuka
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
              Titik api, gempa, kesehatan vegetasi, dan tutupan lahan dalam satu tempat — lengkap dengan sumber, waktu pengambilan,
              dan keterbatasan setiap data.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="px-8">
                <Link href="/maps">
                  Buka peta <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-8">
                <Link href="/dashboard">Lihat dashboard</Link>
              </Button>
            </div>
            <LiveStrip />
          </section>

          <section aria-labelledby="fitur" className="bg-white/60 py-16">
            <div className="mx-auto max-w-6xl px-6">
              <h2 id="fitur" className="text-center text-3xl font-bold tracking-tight text-emerald-950">
                Yang bisa Anda lakukan
              </h2>
              <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map(({ href, icon: Icon, title, text, color }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="group flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br ${color}`} aria-hidden>
                        <Icon className="h-5 w-5 text-white" />
                      </span>
                      <h3 className="text-lg font-semibold text-emerald-950">{title}</h3>
                      <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{text}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-800">
                        Buka <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mx-auto mt-6 flex max-w-3xl items-start gap-3 rounded-xl border bg-card p-5">
                <span className="mt-0.5 rounded-lg bg-emerald-100 p-2 text-emerald-800" aria-hidden>
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-emerald-950">LandAI, asisten yang menjawab dengan data langsung</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tanyakan “berapa titik api di Kalimantan Tengah hari ini?” atau “bagaimana vegetasi di titik yang saya pilih?”.
                    Jawabannya diambil dari sumber yang sama dengan dashboard — bukan dikarang. Klik ikon obrolan di pojok kanan bawah.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="data" className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid gap-10 lg:grid-cols-2">
              <div>
                <h2 id="data" className="text-3xl font-bold tracking-tight text-emerald-950">
                  Dari mana datanya?
                </h2>
                <p className="mt-3 text-muted-foreground">
                  EcoSentra tidak menyimpan citra sendiri. Setiap angka diambil dari penyedia terbuka berikut dan selalu mencantumkan
                  sumber serta waktu pengambilannya.
                </p>
                <ul className="mt-5 divide-y rounded-xl border bg-card">
                  {SOURCES.map(([name, what]) => (
                    <li key={name} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                      <span className="font-medium">{name}</span>
                      <span className="text-muted-foreground">{what}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight text-emerald-950">Jujur soal keterbatasan</h2>
                <div className="flex gap-3 rounded-xl border bg-card p-5">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Titik api bukan kebakaran terverifikasi.</strong> NDVI bukan diagnosis kesehatan
                    tanaman. Tutupan lahan adalah klasifikasi otomatis. Awan sering menghalangi satelit di Indonesia — dan kami menandainya.
                  </p>
                </div>
                <div className="flex gap-3 rounded-xl border bg-card p-5">
                  <Scale className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Metodologi terbuka.</strong> Ambang peringatan, sumber, lisensi, dan cara
                    perhitungan dijelaskan di halaman{" "}
                    <Link href="/help" className="font-medium text-emerald-800 underline underline-offset-2">
                      Bantuan & Metodologi
                    </Link>
                    ; kodenya open source (MIT).
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t bg-emerald-950 text-emerald-50">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm sm:flex-row">
            <p>© 2025–2026 Tim EcoSentra · Lisensi MIT · Proyek GEMASTIK 2025</p>
            <nav aria-label="Tautan kaki" className="flex gap-5">
              <Link href="/help" className="hover:underline">
                Metodologi
              </Link>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">
                GitHub
              </a>
              <Link href="/login" className="hover:underline">
                Masuk
              </Link>
            </nav>
          </div>
        </footer>

        <AskLandAI />
      </div>
    </AssistantProvider>
  )
}
