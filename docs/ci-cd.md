# CI/CD — EcoSentra

Pipeline GitHub Actions ada di `.github/workflows/ci.yml`. Berjalan di setiap
`push` ke branch apa pun dan di setiap pull request ke `develop`/`staging`/`main`
(run lama di branch yang sama otomatis dibatalkan).

## Job

| Job | Isi | Blocking? |
|---|---|---|
| **web** | `npm ci` → `npm run lint` → `npm run typecheck` → `npm test` (Vitest) → `npm run build` → `npm audit --omit=dev --audit-level=critical` | ya, semua langkah |
| **web-emulator** | `firebase emulators:exec --config firebase.emulators.json` (Auth + Firestore, memakai `firestore.rules` repo) → `npm run test:emulator`: 7 uji integrasi dengan **Admin SDK asli** | ya |
| **geo** | `pip install -r requirements-dev.txt` → `ruff check .` → `pytest` (`services/geo`) | ya |
| **mcp** | idem untuk `services/mcp`, termasuk uji protokol MCP lewat stdio sungguhan | ya |
| **docker** | `docker build` image `services/geo` dan `services/mcp` (tanpa push) | ya |

Node 22 dan Python 3.12 (sesuai `engines`/Dockerfile).

### Tidak butuh secret

Build web **tidak** membutuhkan kredensial Firebase atau Anthropic: Firebase
Admin diinisialisasi malas (saat route membutuhkannya), jadi aplikasi dibangun
dalam mode demo. Sebelumnya pipeline gagal "merah" sampai tiga secret Firebase
diisi; sekarang tidak perlu secret apa pun. (Secret `FIREBASE_*` lama di
repository settings boleh dihapus.)

### Uji yang berjalan

- `apps/web/tests/server` — parser & agregasi sumber data (FIRMS, BMKG, Open-Meteo,
  MODIS, Esri), cache, data provinsi, memakai fixture respons asli.
- `apps/web/tests/api` — route handler dengan Firestore/Auth palsu in-memory:
  autentikasi, isolasi antar-pengguna, validasi, rate limit, admin-only, ekspor, hapus akun.
- `apps/web/tests/integration` — Admin SDK asli vs emulator Auth + Firestore: verifikasi ID token,
  CRUD & isolasi, kaskade hapus (query + batch), custom claim admin, urutan `orderBy`, hapus akun,
  dan `firestore.rules` menolak akses klien (REST tanpa Admin SDK). Dilewati otomatis di `npm test`
  kalau emulator tidak berjalan.
- `apps/web/tests/assistant` — aturan LandAI, loop alat Claude (klien palsu), route chat.
- `apps/web/tests/lib` — peringatan, rekomendasi, NDVI, redirect aman, layer peta, pencarian provinsi.
- `services/geo/tests`, `services/mcp/tests` — API, kepemilikan API key, rate limit, alat MCP,
  dan satu uji ujung-ke-ujung via protokol MCP.

Test tidak memanggil internet: respons penyedia data diganti fixture di
`apps/web/tests/fixtures/`.

## Menambah job

Tambahkan di `jobs:` — job berjalan paralel kecuali ada `needs:`. Untuk layanan
Python baru, salin pola job `geo` (setup-python + cache pip + ruff + pytest).

## Deploy

Pipeline ini hanya memverifikasi. Deploy dilakukan manual atau lewat integrasi
platform (lihat [`deployment.md`](./deployment.md)). Alur cabang mengikuti
[`git-workflow.md`](./git-workflow.md).

## Catatan perawatan

- `next lint` ditandai deprecated di Next 15.5 dan dihapus di Next 16. Saat
  memutakhirkan ke Next 16, migrasikan ke ESLint CLI (`npx @next/codemod@canary next-lint-to-eslint-cli .`).
  Dependabot sengaja tidak mengusulkan lompatan mayor `next`/`eslint`.
- Build mengunduh font Google (`next/font/google`) saat build — runner perlu akses internet.
