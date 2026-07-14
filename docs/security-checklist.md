# Security Checklist — EcoSentra

Hasil audit keamanan fondasi (Fase 2), dikerjakan di branch `feature/sec-audit`
(+ satu perbaikan terkait di `feature/be-landcover-gee`). Audit ini **bukan**
implementasi sistem auth/login — itu item roadmap terpisah, lihat bagian
paling bawah.

## Ringkasan Temuan TAHAP 1 (Audit Kredensial & Secret)

| # | Temuan | Tingkat | Status |
|---|---|---|---|
| 1 | Private key Firebase Admin SDK asli + API key ter-commit di `README.md` pada 2 commit paling awal riwayat Git (`8f7b9e1a`, `f0a058a3`, Agustus 2025). Repo ini **PUBLIC** di GitHub — kredensial ini harus dianggap bocor/terkompromi. Sudah dihapus dari file versi terbaru sejak commit `2a866194`, tapi **masih ada permanen di riwayat Git**. | 🔴 Kritis | Kredensial **sudah dirotasi** oleh pemilik repo di Firebase/GCP Console (di luar sesi ini). Riwayat Git **belum dibersihkan** — keputusan sadar untuk menunda `git filter-repo`/BFG (berisiko, perlu koordinasi force-push semua branch), fokus ke rotasi dulu. |
| 2 | `.gitignore` berbeda-beda di 8 branch yang dicek — `main`, `staging`, `develop`, dan sebagian besar branch fitur **tidak** memblokir `.env` generik, `credentials/`, file Python (`.venv/`, `__pycache__/`), atau `.vscode/`. File kredensial GEE asli (`services/geo/credentials/*.json`, `.env`) sempat **tidak terlindungi** di branch hasil audit ini sendiri sebelum diperbaiki. | 🟠 Tinggi | ✅ Diperbaiki (TAHAP 2) — `.gitignore` dikonsolidasi, diverifikasi tidak memblokir config legit (`package.json`, dll) dan berhasil memblokir kredensial asli yang ada di disk. |
| 3 | `server/firebaseAdmin.ts` — `console.error` melempar objek error SDK penuh saat inisialisasi gagal; berisiko kecil membocorkan sebagian info kredensial ke log server. | 🟡 Rendah | Belum diperbaiki — dicatat, risiko kecil dan tidak mendesak. |
| — | `AIzaSyExample_Google_API_Key_Here` (contoh dummy di file lama, sudah terhapus) dan referensi `client_email` di kode/dokumentasi milik audit ini sendiri — diverifikasi **bukan kebocoran**. | ✅ Aman | Tidak perlu tindakan. |

## Checklist Keamanan Dasar

- [x] `.gitignore` memblokir `.env`, `credentials/`, `*.pem`, `*.key`, pola nama file service account umum, artefak Python/editor
- [x] `.env.example` ada & berisi nama variabel saja (tanpa nilai asli) di `apps/web`, `services/ml`, `services/geo`, `services/mcp` — masing-masing di branch yang relevan
- [x] Validasi input generik (Zod) di 9 route Firestore `apps/web/app/api/*` (body wajib objek valid, tidak kosong, batas ukuran, tolak field ter-reserved)
- [x] Validasi query param dasar (`userId`, `fieldId`, `id`, `sessionId`) — batas panjang wajar
- [x] Validasi input `services/geo` (`POST /api/landcover`, Pydantic) & `services/mcp` (`get_land_cover`) — sudah benar sejak awal, diverifikasi ulang
- [x] Rate limiting per-IP (10 req/menit) di `POST /api/landcover` (satu-satunya endpoint yang memanggil layanan eksternal berbayar/berkuota, GEE)
- [x] Kredensial GEE/Firebase yang bocor — sudah dirotasi
- [ ] Riwayat Git yang mengandung kredensial lama — **belum dibersihkan** (keputusan sadar, ditunda)
- [ ] Firestore Security Rules — **tidak ada file `firestore.rules` di repo mana pun** (tidak ter-version-control). Karena semua akses saat ini lewat `firebase-admin` (Admin SDK, bypass Security Rules sepenuhnya), kontrol akses efektif ada di level route API — yang saat ini tanpa auth (lihat roadmap di bawah). Perlu dicek langsung di Firebase Console apa isi rules saat ini.
- [ ] Autentikasi/otorisasi di route API — **tidak ada sama sekali** di 9 route `apps/web/app/api/*` (siapa pun bisa baca/tulis semua koleksi tanpa login). Di luar cakupan audit ini.
- [ ] Rate limiting `services/mcp` — dianggap tidak perlu terpisah untuk saat ini (traffic-nya lewat `services/geo` yang sudah dibatasi; pola pemakaian MCP beda dari endpoint HTTP publik)

## Roadmap — Di Luar Tanggung Jawab Audit Ini

Item berikut **bukan** bagian dari audit fondasi ini (sengaja ditunda per instruksi awal), dicatat supaya tidak hilang dari radar:

1. **Sistem autentikasi/otorisasi user** — belum ada sama sekali. Ini yang paling penting untuk dikerjakan berikutnya, karena tanpanya, perbaikan validasi/rate-limit di audit ini hanya menutup sebagian celah (siapa pun tetap bisa baca/tulis data).
2. **Firestore Security Rules** — perlu ditulis eksplisit dan di-version-control (`firestore.rules` + `firebase.json` diarahkan ke situ), terutama kalau `lib/firebaseClient.ts` (saat ini belum dipakai) mulai dipakai untuk akses langsung dari browser.
3. **Pembersihan riwayat Git** yang mengandung kredensial lama (`git filter-repo`/BFG) — kalau nanti diputuskan perlu, butuh rencana detail (semua branch, force-push, koordinasi ulang collaborator).
4. **Skema Zod per-koleksi** yang lebih ketat (bukan generik) — begitu bentuk data tiap koleksi (`fields`, `alerts`, dst.) didefinisikan resmi.
5. **Rate limiter yang lebih kuat** (Redis-backed atau level infrastruktur/CDN) — kalau traffic sudah nyata atau di-deploy multi-instance.
