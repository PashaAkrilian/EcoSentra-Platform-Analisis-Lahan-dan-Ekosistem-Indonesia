# Changelog

## 1.0.0 — rilis final

Penulisan ulang menyeluruh dari prototipe (UI memakai data contoh) menjadi platform dengan data nyata.

### Ditambahkan
- **Data nyata** (tanpa kredensial): NASA FIRMS (titik api, difilter ke daratan Indonesia + label provinsi),
  BMKG (gempa), Open-Meteo (cuaca, kelembapan tanah), NASA MODIS via ORNL (NDVI, dengan penanda awan),
  Esri / Impact Observatory 10 m (tutupan lahan titik & provinsi), NASA GIBS (layer NDVI/suhu, legenda resmi).
- **Peta & Analisis**: layer, analisis titik terpadu, ekspor GeoJSON/CSV/KML, tautan yang bisa dibagikan.
- **Halaman**: Dashboard, Peringatan Bencana (otomatis + kurasi admin), Profil Ekosistem (menggantikan
  "Jasa Ekosistem"), Lahan Saya, Pendukung Keputusan (rekomendasi aturan transparan), Pengaturan,
  Bantuan & Metodologi, Login, 404/error.
- **Akun**: Firebase Auth (email/kata sandi, Google), data per-pengguna, peran admin (custom claim), hapus akun + data.
- **LandAI**: asisten dengan alat data langsung — mode aturan (gratis) dan mode Claude (tool use, streaming).
- **MCP server**: 5 tool di atas API EcoSentra; kompatibel `mcp` 1.x & 2.x.
- **Infrastruktur**: cache stale-while-revalidate, pemanasan cache, rate limit, header keamanan + CSP,
  `firestore.rules`, CI (lint/type/test/build/audit/Docker), Dependabot, Firebase Emulator untuk dev & uji.
- **Pengujian**: 177 test: 148 web (141 unit/API + 7 uji integrasi Admin SDK asli terhadap emulator), 13 geo, 16 MCP.
- **Dokumentasi**: arsitektur, API, deployment, sumber data & lisensi, keamanan, CI/CD.

### Diubah
- Next.js 15.2.4 → 15.5.27 (menutup advisory kritis), firebase-admin 13 → 14, `npm audit` produksi 35 → 8 temuan (0 kritis).
- Build tidak lagi menyembunyikan galat TypeScript/ESLint; tidak butuh secret untuk build.
- Leaflet dari npm (sebelumnya disisipkan dari CDN saat runtime).
- `services/geo`: API key opsional, container non-root, test.
- `services/mcp`: tool memanggil API EcoSentra; `requirements.txt` dibatasi versi (tanpa batas, instalasi baru mendapat
  `mcp` 2.x yang membuat `server.py` lama gagal di-import).

### Dihapus
- Seluruh data mock di UI, statistik/kontak karangan di beranda, komponen peta berbasis CDN, aset placeholder template.
- Endpoint tanpa autentikasi dan tak terpakai: `/api/users` (membocorkan semua user), `/api/chatSessions`,
  `/api/exportRequests`, `/api/ecoServicesMetrics`; `docs/api-contracts.md` (digantikan `docs/api.md`).

### Diperbaiki
- Dari Indonesia, `fetch` Node ke NASA gagal "ETIMEDOUT" (handshake ±265 ms > batas bawaan 250 ms) — dinaikkan di `instrumentation.node.ts`.
- Peringatan titik api yang berisik (ambang minimum 20 titik/provinsi/24 jam).
- Form: titik desimal hilang saat mengetik koordinat (`107.6766` menjadi `1076766`); pesan galat tetap tampil
  setelah field diperbaiki; "Tanya LandAI" dari detail skenario membuka panel di balik dialog.
- Nama tampilan profil baru memakai nama akun login (bukan "Pengguna").
- Pesan galat validasi berbahasa Indonesia di form dan API (sebelumnya "Expected number, received nan",
  "String must contain at least 3 character(s)").
- LandAI mode aturan menjawab pertanyaan berkoordinat dengan ringkasan lokasi (titik api sekitar, cuaca,
  NDVI, tutupan lahan, rekomendasi), bukan statistik nasional; alat baru `get_location_briefing` dan opsi
  `lat/lng` pada `get_fire_hotspots` (juga tersedia untuk mode Claude).
- Aksesibilitas: tautan "Lewati ke konten" dan judul halaman per rute.
- Emulator Firebase memakai `firebase.emulators.json`: `hosting.source` di `firebase.json` membuat `firebase-tools`
  mencoba membangun Next.js tiap emulator dijalankan; perintah CI `emulators:exec` diverifikasi lokal.

### Belum dikerjakan
Lihat bagian "Langkah berikutnya" di `README.md` (verifikasi LandAI Claude dengan kunci sungguhan, deploy, tile berbayar,
38 provinsi, pelatihan ulang SegFormer, keputusan soal riwayat Git).
