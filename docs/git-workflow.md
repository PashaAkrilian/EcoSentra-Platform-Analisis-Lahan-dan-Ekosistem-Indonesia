# Git Workflow — EcoSentra

Dokumen ini mendefinisikan strategi branching dan konvensi kerja Git untuk
pengembangan EcoSentra (solo development, mengikuti pola industri
`main`/`develop`/`feature`).

## Struktur Proyek

Repo ini adalah monorepo dengan struktur:

- `apps/web` — Frontend (Next.js/TypeScript) & Backend API utama (Next.js API Routes di `apps/web/app/api`)
- `services/ml` — Layanan ML (FastAPI/Python) — *placeholder, belum ada kode*
- `services/mcp` — MCP server (Python) — *placeholder, belum ada kode*

Konvensi penamaan branch di bawah ini mengacu ke **domain fitur**
(frontend/backend/ml/mcp), bukan ke path folder secara ketat — jadi konvensi
ini tetap berlaku meski `services/ml` dan `services/mcp` masih kosong sampai
diisi lewat branch `feature/ml-*` / `feature/mcp-*` masing-masing.

## Diagram Alur Branch

```
main        ●────────────────────────●───────────●──▶  (produksi, stabil)
             \                       / \         /
develop       ●───●───●───●───●────●   ●───●────●      (staging/integrasi)
                  \       \    \
feature/fe-*       ●───●   \    \
feature/be-*                ●────●
feature/ml-*                      \
feature/mcp-*                      ●───●
```

- `main` — produksi. Harus selalu stabil. **Tidak ada push langsung**, hanya
  menerima merge dari `develop` lewat Pull Request.
- `develop` — staging/integrasi. Semua fitur digabung ke sini dulu sebelum
  naik ke `main`. **Tidak ada push langsung**, hanya merge dari `feature/*`,
  `bugfix/*`, `docs/*` lewat Pull Request.

## Konvensi Penamaan Branch

| Prefix          | Domain                          | Contoh                          |
|------------------|----------------------------------|----------------------------------|
| `feature/fe-*`  | Frontend (Next.js/TypeScript)    | `feature/fe-peta-titikapi`      |
| `feature/be-*`  | Backend API (Next.js API Routes) | `feature/be-firms-api`          |
| `feature/ml-*`  | Layanan ML (FastAPI/Python)      | `feature/ml-predict`            |
| `feature/mcp-*` | MCP server (Python)              | `feature/mcp-query-tool`        |
| `bugfix/*`      | Perbaikan bug                    | `bugfix/fix-map-marker-crash`   |
| `docs/*`        | Dokumentasi                      | `docs/update-readme-setup`      |
| `chore/*`       | Infra/restrukturisasi lintas-domain (bukan fitur/bug/docs) | `chore/restructure-monorepo` |

## Alur Kerja Standar Mengerjakan Fitur

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
5. Buka Pull Request dari `feature/fe-peta-titikapi` → `develop` di GitHub.
   Isi template PR yang sudah tersedia otomatis
   (`.github/pull_request_template.md`).
6. Setelah PR direview (self-review untuk solo dev) dan checklist terpenuhi,
   merge ke `develop`.
7. Setelah beberapa fitur terkumpul di `develop` dan dianggap stabil, buka
   Pull Request dari `develop` → `main`, lalu merge untuk rilis ke produksi.

## Aturan Commit Message

Gunakan kalimat imperatif, singkat, dan jelas — bayangkan menyambung kalimat
"Jika di-apply, commit ini akan ___".

**Contoh benar:**
- `Add FIRMS hotspot fetcher to ml service`
- `Fix map marker not rendering on zoom out`
- `Update git workflow documentation`

**Contoh salah (hindari):**
- `update` — tidak jelas apa yang diubah
- `fix stuff` — tidak spesifik
- `wip` — jangan commit dengan pesan "work in progress", selesaikan dulu atau squash sebelum push
- `asdasd`, `.` — tidak ada informasi sama sekali

## Branch Protection

Lihat instruksi setup branch protection untuk `main` dan `develop` di
GitHub Settings (dijelaskan terpisah oleh asisten / tim, dilakukan manual
lewat halaman Settings repo, bukan lewat command line).
