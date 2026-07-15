# CI/CD — EcoSentra

Dikerjakan di branch `chore/ci-setup`. Dokumen ini menjelaskan pipeline
GitHub Actions yang ada sekarang (`.github/workflows/ci.yml`), kenapa
strukturnya begini, dan cara menambah job baru nanti.

## Kondisi Nyata Saat Ini (per audit di `develop`)

Hanya `apps/web` yang benar-benar bisa di-install/lint/build. `services/ml`
dan `services/mcp` di `develop` baru berisi `README.md` placeholder, dan
`services/geo` bahkan belum ada foldernya di `develop` sama sekali (kodenya
ada di branch `feature/be-landcover-gee`, belum merge). Karena itu, CI ini
**hanya punya satu job** untuk sekarang. Job untuk `services/*` sengaja
tidak dibuat — kalau dipaksa dibuat, job itu akan gagal terus karena tidak
ada yang bisa di-install/build, dan itu bikin CI merah secara palsu (bukan
karena ada bug, tapi karena job-nya memang tidak punya apa-apa untuk
dikerjakan).

## Trigger

```yaml
on:
  push:
    branches: ["**"]
  pull_request:
    branches: [develop, staging, main]
```

- **`push` ke branch apa pun** — supaya kamu dapat feedback lint/type-check/build
  secepat mungkin saat kerja di branch fitur sendiri, sebelum buka PR.
- **`pull_request` ke `develop`/`staging`/`main`** — supaya PR ke branch-branch
  utama (sesuai GitLab Flow di `docs/git-workflow.md`) selalu dicek ulang.

## Job: `Frontend Lint & Build`

Jalan di `ubuntu-latest`, semua step `working-directory: apps/web`.

1. **Checkout** — `actions/checkout@v4`.
2. **Setup Node.js** — Node 20 (versi minimum yang didukung Next.js 15.2.4),
   pakai `cache: npm` bawaan `actions/setup-node` supaya `node_modules` tidak
   di-download ulang dari nol tiap run (cache di-key dari
   `apps/web/package-lock.json`).
3. **Install dependencies** — `npm ci` (pakai lockfile, bukan `npm install`,
   supaya versi dependency konsisten dengan yang di-commit).
4. **Lint** — `npm run lint` (`next lint`). **Non-blocking**
   (`continue-on-error: true`) untuk sekarang: begitu saya tambahkan
   `.eslintrc.json` + dependency `eslint`/`eslint-config-next` (sebelumnya
   repo ini tidak punya lint config sama sekali, jadi `next lint` tidak bisa
   jalan), lint langsung menemukan beberapa error nyata yang sudah lama ada
   (`react/no-unescaped-entities` di `app/page.tsx` & `app/eco-services/page.tsx`,
   plus warning `react-hooks/exhaustive-deps` di `components/leaflet-map.tsx`).
   Errornya sudah ada sebelum task CI ini dan bukan bagian dari scope task
   ini untuk diperbaiki — dibuat non-blocking dengan alasan yang sama persis
   dengan keputusan type-check di bawah, supaya konsisten.
5. **Type-check** — `npx tsc --noEmit`. **Non-blocking** juga: ada 7 error
   TypeScript lama di `components/ui/chart.tsx` (kemungkinan besar versi
   `recharts` tidak cocok dengan tipenya) yang selama ini disembunyikan lewat
   `typescript.ignoreBuildErrors: true` di `next.config.mjs`. Sudah dikonfirmasi
   ini keputusan sadar (bukan default) — kamu pilih non-blocking supaya CI
   tidak langsung merah di run pertama untuk utang teknis yang tidak
   berkaitan dengan PR manapun nanti.
6. **Build** — `npm run build` (`next build`). Butuh 3 env var karena
   `server/firebaseAdmin.ts` (dipakai oleh semua route di `app/api/*`) throw
   error kalau env var ini kosong:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

   Diambil dari **GitHub Actions Secrets** (`secrets.FIREBASE_*`), bukan
   ditulis langsung di workflow. Build ini tidak benar-benar memanggil
   Firestore (tidak ada request nyata saat build), jadi kredensial cukup
   berformat valid — tidak wajib pakai kredensial produksi asli.
7. **Test** — belum ada. Ditandai komentar
   `# TODO: tambahkan step test di sini setelah Fase 4 (testing) selesai`,
   BUKAN step kosong yang berpura-pura lulus.

## Yang Perlu Kamu Lakukan Manual di GitHub (sebelum CI ini jalan penuh)

Tambahkan 3 repository secret (Settings → Secrets and variables → Actions →
New repository secret):
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Tanpa ini, step **Build** akan gagal (bukan non-blocking — build memang harus
berhasil menghasilkan output, jadi ini step yang paling penting untuk
disiapkan).

## Cara Menambah Job Baru Nanti

Begitu salah satu feature branch berikut merge ke `develop`, tambahkan job
baru di `.github/workflows/ci.yml` (jalan paralel otomatis karena tidak ada
`needs:` di antara job) — pola strukturnya sama seperti job `frontend`:

- **`services/geo`** (setelah `feature/be-landcover-gee` merge) — Python/FastAPI:
  ```yaml
  geo-service:
    name: Geo Service Check
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: services/geo
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
          cache-dependency-path: services/geo/requirements.txt
      - run: pip install -r requirements.txt
      # TODO: lint (mis. ruff) & test setelah tersedia
  ```
- **`services/mcp`** (setelah `feature/mcp-landcover` merge) — pola serupa,
  `working-directory: services/mcp`.
- **`services/ml`** (setelah ada kode API, bukan cuma eksperimen training) —
  pola serupa, sesuaikan dengan dependency yang dipakai (`requirements.txt`
  atau `pyproject.toml`, tergantung yang dipilih nanti).

Kalau nanti error lint/type-check lama di atas sudah diperbaiki, hapus baris
`continue-on-error: true` di step terkait supaya kembali strict/blocking.

## Verifikasi Setelah Push

1. Push branch ini (lihat perintah di bawah).
2. Buka tab **Actions** di GitHub — akan muncul run baru bernama "CI" begitu
   push diterima.
3. Klik run tersebut → job **Frontend Lint & Build** → pastikan step
   **Install dependencies** dan **Build** hijau (dua ini blocking). Step
   **Lint** dan **Type-check** boleh kuning/tercoret (non-blocking) tapi buka
   log-nya untuk lihat error yang dilaporkan.
4. Kalau **Build** merah: kemungkinan besar 3 secret Firebase di atas belum
   ditambahkan di repository settings.
