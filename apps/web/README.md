# apps/web — EcoSentra (UI + API)

Next.js 15 (App Router, React 19, TypeScript) — halaman dan API routes dalam satu app.
Gambaran besar: [`../../docs/architecture.md`](../../docs/architecture.md); endpoint:
[`../../docs/api.md`](../../docs/api.md).

## Menjalankan

```bash
npm ci
npm run dev          # http://localhost:8080 (mode demo, tanpa kredensial)
```

| Perintah | Fungsi |
|---|---|
| `npm run dev` / `build` / `start` | server dev, build produksi, jalankan hasil build |
| `npm run lint` | `next lint` (ESLint `next/core-web-vitals`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (tests/server, api, assistant, lib) — tanpa internet, memakai fixture |
| `npm run test:emulator` | uji integrasi dengan Admin SDK asli; butuh Firebase Emulator (lihat di bawah) |
| `npm run seed -- <uid> [--admin]` | data contoh untuk satu akun (+ peran admin) |

Variabel lingkungan: semua **opsional**, dijelaskan di [`.env.local.example`](./.env.local.example).
Node ≥ 22.12 (dibutuhkan firebase-admin 14).

## Struktur

```
app/
  (app)/                 halaman berlayout aplikasi (sidebar): dashboard, maps, fields,
                         disaster-alerts, ecosystem, decision-support, settings, help
  login/                 login/daftar
  api/                   route handlers
components/
  ui/                    primitif shadcn (Button, Card, Dialog, Select, …)
  charts/ map/ fields/ decisions/ alerts/ forms/ chat/ landing/
  app-shell.tsx          sidebar + menu mobile + status login + LandAI
hooks/                   use-api (fetch + state), use-hotspots, use-location-data, use-chat
lib/                     aman dipakai klien: tipe (data/types.ts), skema Zod, format, geo,
                         alerts, recommendations, ndvi, provinces, map/layers
server/                  HANYA server (`import "server-only"`): sources/, geo/, assistant/,
                         auth, firestore, cache, rateLimit, http, firebaseAdmin
tests/                   Vitest + fixture respons penyedia data asli
scripts/                 seedFirestore.mjs, geo/build_provinces.py
instrumentation*.ts      pengaturan jaringan Node + pemanasan cache saat server start
```

## Konvensi

- **Tidak ada data mock di UI.** Data harus berasal dari modul di `server/sources/`;
  kalau sumber gagal, tampilkan `ErrorState` dengan tombol coba-lagi.
- Setiap tampilan data memakai `SourceNote` (sumber + waktu pengambilan).
- API route: bungkus dengan `handleRoute`, validasi input dengan skema di `lib/schemas.ts`,
  data milik user lewat helper `server/firestore.ts` (selalu ber-scope `uid`).
- Konten dari luar (BMKG, model bahasa) tidak boleh masuk lewat `innerHTML` — pakai
  `textContent` / elemen React.
- Warna grafik: satu warna per entitas (`components/charts/chart-utils.tsx`); teks tidak
  memakai warna data; status = warna + ikon + teks.
- Komentar & UI berbahasa Indonesia.

## Memperbarui data batas provinsi

`server/geo/indonesia-provinces.json` dan `lib/province-meta.json` dihasilkan oleh
`scripts/geo/build_provinces.py` dari geoBoundaries (instruksi di kepala file skrip).

## Pengembangan dengan Firebase Emulator

Tanpa project Firebase sungguhan: lihat bagian "Emulator" di
[`../../docs/deployment.md`](../../docs/deployment.md). Uji integrasi:

```bash
# dari root repo
npx firebase-tools emulators:exec --config firebase.emulators.json \
  --only auth,firestore --project demo-ecosentra \
  "FIREBASE_PROJECT_ID=demo-ecosentra npm run test:emulator --prefix apps/web"
```
