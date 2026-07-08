## Ringkasan Perubahan

<!-- Jelaskan singkat apa yang berubah dan mengapa. -->

## Domain

- [ ] FE (Frontend)
- [ ] BE (Backend API)
- [ ] ML (Layanan ML)
- [ ] MCP (MCP Server)
- [ ] SEC (Security)

## Jenis Perubahan

- [ ] Feature (fitur baru)
- [ ] Bugfix (perbaikan bug)
- [ ] Docs (dokumentasi)

## Branch Tujuan

- [ ] `develop` (fitur/bugfix/docs baru — target normal)
- [ ] `staging` (promosi dari `develop`, setelah stabil)
- [ ] `main` (rilis dari `staging`, setelah lolos tes akhir)

## Checklist

- [ ] Sudah dites secara lokal (manual atau otomatis)
- [ ] `npm run lint` lolos tanpa error
- [ ] Tidak ada model/secret / kredensial / file `.env` yang ter-commit
- [ ] Branch target PR ini sudah benar sesuai alur `develop → staging → main`
