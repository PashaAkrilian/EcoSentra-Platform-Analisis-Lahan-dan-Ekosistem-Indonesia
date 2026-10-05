# Sumber Data, Lisensi, dan Atribusi

EcoSentra tidak menyimpan citra satelit. Setiap angka diambil langsung dari
penyedia terbuka saat dibutuhkan, di-cache sebentar di memori server, dan
selalu ditampilkan bersama sumber & waktu pengambilannya. Daftar ini adalah
**kewajiban atribusi** kalau Anda menyebarkan ulang data atau men-deploy
aplikasinya.

| Sumber | Dipakai untuk | Pembaruan | Lisensi / syarat | Catatan teknis |
|---|---|---|---|---|
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/active_fire/) — VIIRS 375 m | titik api (peta, dashboard, peringatan, ekspor) | ±3 jam | data NASA terbuka; cantumkan NASA FIRMS | CSV publik per wilayah (`SouthEast_Asia_{24h,48h,7d}`), **tanpa MAP_KEY**. Satelit dipilih lewat `FIRMS_SATELLITE` (`snpp`, `noaa20`, `noaa21`) |
| [BMKG Data Terbuka](https://data.bmkg.go.id/gempabumi/) | gempa M 5+ & dirasakan | menit | **wajib mencantumkan BMKG sebagai sumber** | `autogempa`, `gempaterkini`, `gempadirasakan` (JSON) |
| [Esri / Impact Observatory 10 m LULC](https://livingatlas.arcgis.com/landcover/) | tutupan lahan (titik & provinsi), layer peta | tahunan | CC BY 4.0 | ImageServer publik: `computeHistograms` (analisis) & `exportImage` (tile) |
| [ESA WorldCover v200](https://esa-worldcover.org/) via Google Earth Engine | alternatif tutupan lahan (`services/geo`, opsional) | snapshot 2021 | CC BY 4.0; penggunaan GEE tunduk pada syarat Google | butuh service account GEE |
| [NASA MODIS MOD13Q1](https://modis.ornl.gov/data/modis_webservice.html) via ORNL DAAC | deret waktu NDVI per titik | komposit 16 hari | data NASA terbuka | band `250m_16_days_NDVI` + `pixel_reliability` (awan) |
| [NASA GIBS](https://earthdata.nasa.gov/gibs) | layer peta NDVI & suhu permukaan | komposit 8 hari | data NASA terbuka | WMTS RESTful; legenda dari colormap resmi GIBS |
| [Open-Meteo](https://open-meteo.com) | cuaca, prakiraan 7 hari, kelembapan tanah (model) | 15 menit | CC BY 4.0, **non-komersial** gratis | untuk penggunaan komersial perlu paket berbayar |
| [geoBoundaries](https://www.geoboundaries.org/) IDN ADM1 | batas 34 provinsi | statis (2017) | ODbL 1.0 (data turunan juga ODbL) | disederhanakan 0,005° & pulau < 1 km² dibuang oleh `apps/web/scripts/geo/build_provinces.py` |
| OpenStreetMap · Esri World Imagery · OpenTopoMap | peta dasar | terus-menerus | ODbL / ketentuan tile masing-masing | lihat peringatan di bawah |

## Hal yang perlu diperhatikan saat deploy

- **Tile gratis punya batas pemakaian.** `tile.openstreetmap.org` dan
  OpenTopoMap tidak dimaksudkan untuk lalu lintas tinggi (lihat
  [Tile Usage Policy OSM](https://operations.osmfoundation.org/policies/tiles/)).
  Untuk produksi dengan banyak pengguna, ganti URL tile di
  `apps/web/lib/map/layers.ts` dengan penyedia berbayar atau tile server sendiri.
- **Open-Meteo gratis hanya untuk non-komersial.** Pakai API berbayar kalau
  EcoSentra dipakai secara komersial.
- **Latensi dari Indonesia.** Server NASA berada di AS; waktu handshake TCP dari
  Indonesia bisa melewati batas bawaan Node (250 ms). `apps/web/instrumentation.node.ts`
  menaikkannya (`NET_ATTEMPT_TIMEOUT_MS`, default 5000) dan memanaskan cache saat start —
  jangan dihapus.
- **Titik api bukan kebakaran terverifikasi; NDVI bukan diagnosis; tutupan lahan
  adalah klasifikasi otomatis.** Keterbatasan ini tertulis di UI (halaman Bantuan)
  dan harus ikut dipertahankan di turunan apa pun.
