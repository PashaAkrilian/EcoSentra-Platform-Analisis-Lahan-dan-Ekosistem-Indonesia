import type { Metadata } from "next"
import Link from "next/link"
import { PageContainer, PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FIRE_THRESHOLDS_24H, QUAKE_THRESHOLDS } from "@/lib/alerts"

export const metadata: Metadata = { title: "Bantuan & Metodologi" }

const SOURCES = [
  {
    name: "NASA FIRMS (VIIRS 375 m)",
    use: "Titik api (anomali panas) — peta, dashboard, peringatan, ekspor",
    update: "±3 jam (data hampir-real-time)",
    license: "Data NASA terbuka — cantumkan NASA FIRMS",
    limit: "Anomali panas, bukan kebakaran terverifikasi; awan menutupi deteksi; 1 piksel = 375 m",
    url: "https://firms.modaps.eosdis.nasa.gov/active_fire/",
  },
  {
    name: "BMKG — Data Gempa Terbuka",
    use: "Gempa bumi M 5+ dan gempa dirasakan — peta, peringatan",
    update: "Hitungan menit",
    license: "Wajib mencantumkan BMKG sebagai sumber",
    limit: "Bukan peringatan dini resmi; parameter gempa bisa direvisi BMKG",
    url: "https://data.bmkg.go.id/gempabumi/",
  },
  {
    name: "Esri / Impact Observatory — Sentinel-2 10 m Land Cover",
    use: "Komposisi tutupan lahan sekitar titik/lahan; layer peta",
    update: "Tahunan (tahun terbaru otomatis)",
    license: "CC BY 4.0",
    limit: "Klasifikasi otomatis; akurasi bervariasi antar-kelas dan antar-wilayah; awan di daerah tropis mengurangi kualitas",
    url: "https://livingatlas.arcgis.com/landcover/",
  },
  {
    name: "ESA WorldCover v200 via Google Earth Engine (opsional)",
    use: "Alternatif tutupan lahan lewat services/geo (butuh service account GEE)",
    update: "Snapshot 2021",
    license: "CC BY 4.0",
    limit: "Skema kelas berbeda dari Esri; hanya satu tahun",
    url: "https://esa-worldcover.org/",
  },
  {
    name: "NASA MODIS MOD13Q1 via ORNL DAAC",
    use: "Deret waktu NDVI (kesehatan vegetasi) per titik",
    update: "Komposit 16 hari",
    license: "Data NASA terbuka",
    limit: "Resolusi 250 m; nilai di bawah awan tidak andal (ditandai di grafik)",
    url: "https://modis.ornl.gov/data/modis_webservice.html",
  },
  {
    name: "NASA GIBS (MODIS NDVI & suhu permukaan)",
    use: "Layer peta NDVI dan suhu permukaan tanah",
    update: "Komposit 8 hari",
    license: "Data NASA terbuka",
    limit: "Resolusi kasar (250 m – 1 km); area berawan kosong",
    url: "https://earthdata.nasa.gov/gibs",
  },
  {
    name: "Open-Meteo",
    use: "Cuaca terkini, prakiraan 7 hari, kelembapan tanah",
    update: "Tiap 15 menit",
    license: "CC BY 4.0 (non-komersial)",
    limit: "Kelembapan tanah adalah keluaran model, bukan sensor lapangan",
    url: "https://open-meteo.com",
  },
  {
    name: "geoBoundaries (OpenStreetMap)",
    use: "Batas 34 provinsi untuk klasifikasi titik api & layer batas",
    update: "Statis (2017)",
    license: "ODbL 1.0",
    limit: "34 provinsi — belum memuat pemekaran Papua 2022; pulau < 1 km² dihilangkan",
    url: "https://www.geoboundaries.org/",
  },
  {
    name: "OpenStreetMap, Esri World Imagery, OpenTopoMap",
    use: "Peta dasar",
    update: "Terus-menerus",
    license: "ODbL / ketentuan penyedia tile",
    limit: "Tile publik gratis ada batas pemakaian — untuk lalu lintas tinggi gunakan penyedia tile berbayar",
    url: "https://www.openstreetmap.org/copyright",
  },
]

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-3 text-xl font-bold tracking-tight text-emerald-950">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  )
}

export default function HelpPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Bantuan & Metodologi"
        description="Dari mana data berasal, bagaimana peringatan dihitung, dan apa saja keterbatasannya."
      />

      <nav aria-label="Daftar isi" className="mb-8 flex flex-wrap gap-2 text-sm">
        {[
          ["#cara-pakai", "Cara pakai"],
          ["#sumber-data", "Sumber data"],
          ["#peringatan", "Metodologi peringatan"],
          ["#keterbatasan", "Keterbatasan"],
          ["#privasi", "Privasi"],
          ["#mode-demo", "Mode demo & pengaktifan"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full bg-muted px-3 py-1 font-medium text-emerald-900 hover:bg-emerald-100">
            {label}
          </a>
        ))}
      </nav>

      <div className="max-w-5xl space-y-10">
        <Section id="cara-pakai" title="Cara pakai">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Buka <Link href="/maps" className="font-medium text-emerald-800 underline underline-offset-2">Peta & Analisis</Link>.
              Nyalakan layer titik api, gempa, tutupan lahan, NDVI, atau suhu di tab <strong>Layer</strong>.
            </li>
            <li>
              Klik titik mana pun di peta: tab <strong>Analisis</strong> menampilkan komposisi tutupan lahan (radius bisa diatur),
              deret NDVI, cuaca & kelembapan tanah, serta titik api terdekat.
            </li>
            <li>
              Tab <strong>Ekspor</strong> mengunduh titik api sebagai GeoJSON, CSV, atau KML (dengan label provinsi).
            </li>
            <li>
              Masuk dengan akun untuk menyimpan lokasi di <Link href="/fields" className="font-medium text-emerald-800 underline underline-offset-2">Lahan Saya</Link> dan
              mencatat rencana di <Link href="/decision-support" className="font-medium text-emerald-800 underline underline-offset-2">Pendukung Keputusan</Link>.
            </li>
            <li>Tanyakan apa saja ke asisten LandAI (ikon obrolan di pojok kanan bawah) — jawabannya memakai data langsung yang sama.</li>
          </ol>
        </Section>

        <Section id="sumber-data" title="Sumber data">
          <p>
            EcoSentra tidak menyimpan data satelit sendiri: semuanya diambil langsung dari penyedia terbuka berikut saat dibutuhkan,
            lalu disimpan sementara (cache) di server. Setiap tampilan data mencantumkan sumber dan waktu pengambilannya.
          </p>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[56rem] text-left text-xs">
              <caption className="sr-only">Sumber data EcoSentra</caption>
              <thead className="bg-muted">
                <tr>
                  {["Sumber", "Dipakai untuk", "Pembaruan", "Lisensi / atribusi", "Keterbatasan"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SOURCES.map((s) => (
                  <tr key={s.name} className="border-t align-top">
                    <td className="px-3 py-2 font-medium">
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-emerald-800 underline underline-offset-2">
                        {s.name}
                      </a>
                    </td>
                    <td className="px-3 py-2">{s.use}</td>
                    <td className="px-3 py-2">{s.update}</td>
                    <td className="px-3 py-2">{s.license}</td>
                    <td className="px-3 py-2">{s.limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="peringatan" title="Metodologi peringatan">
          <p>
            Peringatan di halaman <Link href="/disaster-alerts" className="font-medium text-emerald-800 underline underline-offset-2">Peringatan Bencana</Link> dihitung
            otomatis dengan ambang sederhana di bawah ini. Ambang ini <strong>buatan EcoSentra</strong> untuk memprioritaskan tampilan —
            bukan status resmi BMKG, BNPB, atau KLHK. Untuk keputusan keselamatan, rujuk selalu lembaga resmi.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gempa bumi (data BMKG)</CardTitle>
                <CardDescription>Gempa 7 hari terakhir dari feed M 5+ dan gempa dirasakan.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <ul className="list-disc space-y-1 pl-5">
                  <li><strong>Kritis:</strong> M ≥ {QUAKE_THRESHOLDS.kritis} atau BMKG menyatakan berpotensi tsunami</li>
                  <li><strong>Tinggi:</strong> M ≥ {QUAKE_THRESHOLDS.tinggi}</li>
                  <li><strong>Sedang:</strong> M ≥ {QUAKE_THRESHOLDS.sedang}</li>
                  <li><strong>Rendah:</strong> M &lt; {QUAKE_THRESHOLDS.sedang}, hanya ditampilkan jika dirasakan warga</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kebakaran (titik api NASA FIRMS)</CardTitle>
                <CardDescription>Jumlah titik api per provinsi dalam 24 jam terakhir.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <ul className="list-disc space-y-1 pl-5">
                  <li><strong>Kritis:</strong> ≥ {FIRE_THRESHOLDS_24H.kritis} titik</li>
                  <li><strong>Tinggi:</strong> ≥ {FIRE_THRESHOLDS_24H.tinggi} titik</li>
                  <li><strong>Sedang:</strong> ≥ {FIRE_THRESHOLDS_24H.sedang} titik</li>
                  <li>Di bawah {FIRE_THRESHOLDS_24H.sedang} titik dianggap aktivitas latar dan tidak dijadikan peringatan.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          <p>
            Titik api difilter ke daratan Indonesia dengan batas provinsi geoBoundaries (data 2017, 34 provinsi). Titik di laut,
            di negara tetangga, atau di pulau yang sangat kecil tidak dihitung. Jumlah titik tidak sama dengan jumlah kebakaran:
            satu kebakaran besar bisa memicu banyak titik, dan pembakaran lahan terkontrol juga terdeteksi.
          </p>
        </Section>

        <Section id="keterbatasan" title="Keterbatasan yang perlu Anda tahu">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Titik api ≠ kebakaran terverifikasi.</strong> Satelit mendeteksi anomali panas; tingkat keyakinan
              (rendah/nominal/tinggi) adalah penilaian algoritma NASA, bukan konfirmasi lapangan.
            </li>
            <li>
              <strong>Awan.</strong> Indonesia sering berawan. Awan menutupi deteksi titik api, melemahkan klasifikasi tutupan lahan,
              dan menekan NDVI. Grafik NDVI menandai observasi berawan dengan titik berongga dan tidak menyambungkannya.
            </li>
            <li>
              <strong>Tutupan lahan adalah klasifikasi otomatis</strong> (model pembelajaran mesin pada citra Sentinel-2) dengan
              akurasi yang berbeda per kelas. Cocok untuk gambaran umum, bukan untuk sengketa batas atau perizinan.
            </li>
            <li>
              <strong>NDVI</strong> menggambarkan kehijauan, bukan langsung kesehatan tanaman. Interpretasi teks (jarang/sedang/lebat)
              bersifat indikatif.
            </li>
            <li>
              <strong>Kelembapan tanah</strong> adalah keluaran model cuaca Open-Meteo pada resolusi puluhan kilometer, bukan
              pengukuran di lahan Anda.
            </li>
            <li>
              <strong>Batas provinsi</strong> memakai 34 provinsi (2017). Provinsi pemekaran Papua 2022 masih tergabung dengan induknya.
            </li>
            <li>
              <strong>Model SegFormer (eksperimen).</strong> Repositori ini memuat eksperimen pelatihan model segmentasi di folder{" "}
              <code className="rounded bg-muted px-1">experiments/</code> dengan akurasi piksel 12–23% — belum layak pakai dan
              <em> tidak</em> dipakai oleh aplikasi. Analisis tutupan lahan di aplikasi memakai dataset Esri/ESA di atas.
            </li>
          </ul>
        </Section>

        <Section id="privasi" title="Privasi">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Tanpa akun, tidak ada data pribadi yang disimpan. Koordinat yang Anda klik dikirim ke server kami hanya untuk
              mengambil data dari penyedia di atas.
            </li>
            <li>
              Dengan akun, yang disimpan: email, nama, organisasi (opsional), lahan, riwayat analisis, dan skenario Anda — hanya
              dapat dibaca oleh Anda (diperiksa di server pada setiap permintaan).
            </li>
            <li>
              Anda dapat menghapus akun beserta seluruh data kapan saja di <Link href="/settings" className="font-medium text-emerald-800 underline underline-offset-2">Pengaturan</Link>.
            </li>
            <li>
              Pertanyaan ke LandAI dikirim ke penyedia model bahasa (Anthropic) hanya jika pemilik instalasi mengaktifkan mode
              LLM; jangan menuliskan data sensitif di obrolan.
            </li>
          </ul>
        </Section>

        <Section id="mode-demo" title="Mode demo & cara mengaktifkan fitur akun">
          <p>
            Tanpa konfigurasi apa pun, aplikasi berjalan dalam <strong>mode demo</strong>: seluruh data publik berfungsi, tetapi
            login dan penyimpanan lahan/skenario nonaktif. Pemilik instalasi mengaktifkannya dengan mengisi variabel lingkungan
            di <code className="rounded bg-muted px-1">apps/web/.env.local</code> (contoh lengkap di{" "}
            <code className="rounded bg-muted px-1">.env.local.example</code>):
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Login:</strong> <code className="rounded bg-muted px-1">NEXT_PUBLIC_FIREBASE_API_KEY</code>, <code className="rounded bg-muted px-1">_AUTH_DOMAIN</code>, <code className="rounded bg-muted px-1">_PROJECT_ID</code>, <code className="rounded bg-muted px-1">_APP_ID</code></li>
            <li><strong>Penyimpanan data:</strong> <code className="rounded bg-muted px-1">FIREBASE_PROJECT_ID</code>, <code className="rounded bg-muted px-1">FIREBASE_CLIENT_EMAIL</code>, <code className="rounded bg-muted px-1">FIREBASE_PRIVATE_KEY</code> (Admin SDK)</li>
            <li><strong>Admin:</strong> jalankan <code className="rounded bg-muted px-1">npm run seed -- &lt;uid&gt; --admin</code> untuk memberi peran admin ke satu akun</li>
            <li><strong>LandAI penuh:</strong> <code className="rounded bg-muted px-1">ANTHROPIC_API_KEY</code></li>
            <li><strong>Tutupan lahan ESA via GEE:</strong> <code className="rounded bg-muted px-1">GEO_SERVICE_URL</code> (lihat <code className="rounded bg-muted px-1">services/geo</code>)</li>
          </ul>
          <p>
            Status tiap integrasi terlihat di <Link href="/settings" className="font-medium text-emerald-800 underline underline-offset-2">Pengaturan</Link>. Panduan deploy
            lengkap ada di <code className="rounded bg-muted px-1">docs/deployment.md</code> pada repositori.
          </p>
        </Section>
      </div>
    </PageContainer>
  )
}
