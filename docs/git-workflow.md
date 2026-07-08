# Git Workflow — EcoSentra

Dokumen ini mendefinisikan strategi branching dan konvensi kerja Git untuk
pengembangan EcoSentra, mengikuti **GitLab Flow** — model percabangan standar
industri dengan tiga branch permanen (`main`, `staging`, `develop`) yang
dipakai bersama oleh seluruh domain, dipisahkan lewat prefix nama branch
fitur (bukan branch `develop` terpisah per domain).

## Struktur Proyek

Repo ini adalah monorepo dengan struktur:

- `apps/web` — Frontend (Next.js/TypeScript) & Backend API utama (Next.js API Routes di `apps/web/app/api`)
- `services/ml` — Layanan ML (FastAPI/Python) — *placeholder, belum ada kode*
- `services/mcp` — MCP server (Python) — *placeholder, belum ada kode*

Konvensi penamaan branch di bawah ini mengacu ke **domain fitur**
(frontend/backend/ml/mcp/security), bukan ke path folder secara ketat — jadi
konvensi ini tetap berlaku meski `services/ml` dan `services/mcp` masih
kosong sampai diisi lewat branch `feature/ml-*` / `feature/mcp-*`
masing-masing. Security (`sec-*`) mencakup keseluruhan proyek, jadi tidak
terikat satu folder tertentu.

### Struktur di dalam `apps/web`

Meski frontend dan backend berbagi satu Next.js app (konsekuensi dari App
Router — API routes harus di `app/api/*`), file-file di dalamnya sudah
dipisah jelas menurut domain:

- **Backend**: `app/api/**` (route handler) + `server/**` (kode server-only,
  mis. `server/firebaseAdmin.ts`). Kode di `server/` memakai Firebase Admin
  SDK dan env var tanpa prefix `NEXT_PUBLIC_` — **jangan pernah** diimport
  dari file yang punya `'use client'`.
- **Frontend**: `app/**` (pages & layout, di luar `app/api`) + `components/**`
  + `hooks/**` + `lib/**` (termasuk `lib/firebaseClient.ts` untuk Firebase
  client SDK di browser).
- **Shared**: `public/**` (aset statis).

## Kenapa GitLab Flow

GitLab Flow dipilih karena menambahkan satu tahap eksplisit yang tidak ada di
model dua-branch sebelumnya: **`staging`** — tempat menguji rilis kandidat
persis seperti kondisi produksi, sebelum benar-benar masuk `main`. Ini
memberi jaring pengaman ekstra tanpa perlu branch `release/*` sekali pakai
atau branch `develop` terpisah per domain (yang justru memperlambat
integrasi lintas-domain seperti FE ↔ BE ↔ ML).

## Diagram Alur Branch

```
main                  ●─────────────────────────●──▶  (produksi, stabil)
                       \                        /
staging                 ●──────────●───────────●        (pra-produksi, tes akhir)
                        /          /
develop        ●───●───●───●─────●                      (integrasi, semua domain)
               /       /  \    \
feature/fe-*  ●───●   /    \    \
feature/be-*          ●────●     \
feature/ml-*                      ●───●
feature/sec-*                          ●──●
```

- **`main`** — produksi. Harus selalu stabil. **Tidak ada push langsung**,
  hanya menerima merge dari `staging` lewat Pull Request.
- **`staging`** — pra-produksi. Tempat tes akhir rilis kandidat sebelum ke
  `main`. **Tidak ada push langsung**, hanya menerima merge dari `develop`
  lewat Pull Request.
- **`develop`** — integrasi. Semua fitur dari semua domain (FE/BE/ML/MCP/SEC)
  digabung dan dites bersama di sini. **Tidak ada push langsung**, hanya
  menerima merge dari `feature/*`, `bugfix/*`, `docs/*`, `chore/*` lewat
  Pull Request.
- **Tidak ada `develop` terpisah per domain** — satu `develop` bersama untuk
  semua domain, dipisahkan cukup lewat prefix nama branch fitur. Ini sesuai
  praktik industri: integrasi lintas-domain (mis. FE yang butuh endpoint BE
  baru) jadi lebih cepat karena tidak perlu sinkronisasi antar banyak branch
  `develop`.

Alur promosi: **`feature/[domain]-*` → `develop` → `staging` → `main`**

## Konvensi Penamaan Branch

| Prefix           | Domain                          | Contoh                            |
|-------------------|----------------------------------|-------------------------------------|
| `feature/fe-*`   | Frontend (Next.js/TypeScript)    | `feature/fe-peta-titikapi`        |
| `feature/be-*`   | Backend API (Next.js API Routes) | `feature/be-firms-api`            |
| `feature/ml-*`   | Layanan ML (FastAPI/Python)      | `feature/ml-predict`              |
| `feature/mcp-*`  | MCP server (Python)              | `feature/mcp-query-tool`          |
| `feature/sec-*`  | Security (lintas-domain)         | `feature/sec-auth-middleware`     |
| `bugfix/*`       | Perbaikan bug                    | `bugfix/fix-map-marker-crash`     |
| `docs/*`         | Dokumentasi                      | `docs/update-readme-setup`        |
| `chore/*`        | Infra/restrukturisasi lintas-domain (bukan fitur/bug/docs) | `chore/restructure-monorepo` |

## Alur Kerja Standar Mengerjakan Fitur

Contoh lengkap: membuat fitur peta titik api (frontend) dari awal sampai ke
produksi.

1. Pastikan `develop` lokal up to date:
   ```bash
   git checkout develop
   git pull origin develop
   ```
2. Buat branch fitur dari `develop`:
   ```bash
   git checkout -b feature/fe-peta-titikapi
   ```
3. Kerjakan perubahan, commit secara bertahap dengan pesan yang jelas (lihat
   aturan commit message di bawah).
4. Push branch ke remote:
   ```bash
   git push -u origin feature/fe-peta-titikapi
   ```
5. Buka Pull Request `feature/fe-peta-titikapi → develop` di GitHub. Isi
   template PR yang tersedia otomatis (`.github/pull_request_template.md`),
   pilih domain **FE** dan branch tujuan **develop**.
6. Setelah checklist PR terpenuhi, merge ke `develop`.
7. Setelah beberapa fitur terkumpul di `develop` dan siap diuji sebagai satu
   rilis kandidat, buka Pull Request `develop → staging`, lalu merge.
8. Lakukan tes akhir di `staging` (mis. smoke test, UAT, cek dengan data
   mirip produksi).
9. Setelah lolos tes di `staging`, buka Pull Request `staging → main`, lalu
   merge — ini yang memicu rilis ke produksi.

## Aturan Commit Message

Gunakan kalimat imperatif, singkat, dan jelas, diawali **prefix domain**
(`FE:`, `BE:`, `ML:`, `MCP:`, `SEC:`, atau tanpa prefix untuk perubahan
lintas-domain seperti `docs`/`chore`) — bayangkan menyambung kalimat "Jika
di-apply, commit ini akan ___".

**Contoh benar:**
- `FE: Add FIRMS hotspot layer to peta titik api`
- `BE: Add FIRMS hotspot fetcher endpoint`
- `SEC: Add auth middleware for API routes`
- `Fix map marker not rendering on zoom out`
- `Update git workflow documentation`

**Contoh salah (hindari):**
- `update` — tidak jelas apa yang diubah, tidak ada prefix domain
- `fix stuff` — tidak spesifik
- `wip` — jangan commit dengan pesan "work in progress", selesaikan dulu atau squash sebelum push
- `asdasd`, `.` — tidak ada informasi sama sekali

## Branch Protection

Lihat instruksi setup branch protection untuk `main`, `staging`, dan
`develop` di GitHub Settings (dijelaskan terpisah oleh asisten / tim,
dilakukan manual lewat halaman Settings repo, bukan lewat command line).
