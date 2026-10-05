# Security Checklist — EcoSentra

Status keamanan terkini. Bagian "Riwayat audit awal" mempertahankan temuan
audit fondasi (Fase 2) supaya jejaknya tidak hilang.

## Model ancaman singkat

| Aset | Ancaman | Kontrol utama |
|---|---|---|
| Data pribadi pengguna (lahan, skenario, profil) | pengguna lain / anonim membaca atau mengubah | semua akses lewat API + Admin SDK; ID token Firebase diverifikasi; setiap dokumen punya `userId`; dokumen milik orang lain → `404`; `firestore.rules` menolak akses klien langsung |
| Peran admin | pengguna menaikkan dirinya jadi admin | admin = custom claim di ID token (hanya bisa di-set dengan Admin SDK); tidak pernah dibaca dari dokumen yang bisa ditulis user; `PUT /api/profile` menolak field `isAdmin` |
| Kuota/biaya layanan berbayar (Claude, Earth Engine) | penyalahgunaan oleh anonim | LandAI mode Claude hanya untuk user login (+ batas 8/mnt/IP & 150/hari/user); `services/geo` mendukung `GEO_API_KEY`; rate limit di endpoint yang memanggil layanan eksternal |
| Layanan data eksternal (NASA, Esri, ORNL, Open-Meteo) | dibanjiri lewat server kita | cache server, rate limit per IP, validasi parameter ketat (koordinat Indonesia, buffer 100–50.000 m) |
| Kredensial (service account Firebase/GEE, kunci API) | bocor lewat repo/log/klien | `.gitignore` berlapis; hanya `.env.example` (tanpa nilai) di repo; modul `server/` ber-`server-only` (build gagal bila terimpor klien); error SDK tidak di-log utuh |
| Integritas tampilan (XSS) | konten eksternal (nama wilayah BMKG, jawaban model) disisipkan sebagai HTML | popup peta dibangun dengan DOM + `textContent`; renderer Markdown LandAI murni elemen React (tanpa `innerHTML`); CSP |

## Checklist

### Sudah dilakukan

- [x] **Autentikasi & otorisasi API** — `server/auth.ts` (Bearer ID token), `server/firestore.ts` (kepemilikan), admin via custom claim. Diuji (`tests/api/*`): 401 tanpa/ salah token, 404 untuk data user lain, 403 non-admin, isolasi antar-user, hapus akun hanya menghapus data sendiri.
- [x] **Firestore Security Rules di-version-control** — `firestore.rules` (tolak semua akses klien) + `firebase.json` menunjuk ke sana.
- [x] **Validasi input per koleksi** — skema Zod `.strict()` di `lib/schemas.ts` (field tak dikenal ditolak, field server `id/userId/createdAt` tak bisa dikirim, koordinat wajib di Indonesia, batas ukuran body 100 KB).
- [x] **Rate limiting** — ekspor (10/mnt), cuaca (30/mnt), NDVI (10/mnt), tutupan lahan (10/mnt), profil ekosistem (20/mnt), analisis lahan (10/mnt), chat (20/mnt; Claude 8/mnt + 150/hari/user), per IP; `services/geo` 10/mnt via slowapi.
- [x] **Header keamanan & CSP** — `next.config.mjs`: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; `poweredByHeader` mati.
- [x] **Build tidak lagi menyembunyikan galat** — `typescript.ignoreBuildErrors` dan `eslint.ignoreDuringBuilds` dihapus; CI memblokir lint/type/test/build.
- [x] **Endpoint berbahaya dihapus** — `GET /api/users` (membocorkan semua user), `chatSessions`, `exportRequests`, `ecoServicesMetrics` (tanpa auth, tak dipakai UI).
- [x] **`/api/healthcheck` tidak membocorkan nama koleksi** — hanya status integrasi (boolean).
- [x] **Redirect login aman** — `safeNextPath` menolak URL absolut, `//host`, trik backslash, karakter kontrol (diuji).
- [x] **Hak hapus data** — `DELETE /api/profile` menghapus akun + semua dokumen milik user.
- [x] **API key opsional untuk `services/geo`** (`GEO_API_KEY`, perbandingan constant-time); container berjalan sebagai non-root.
- [x] **Dependency** — Next.js 15.2.4 → 15.5.27 (menutup advisory kritis), firebase-admin 13 → 14, `npm audit fix`; audit produksi 35 temuan (4 kritis) → 8 (0 kritis). Versi paket dipin (sebelumnya `"latest"`). Dependabot aktif.
- [x] **Kredensial yang pernah bocor sudah dirotasi** (lihat riwayat audit).
- [x] **`.gitignore`** memblokir `.env`, `credentials/`, `*.pem`, `*.key`, pola service account, cache Python.

### Belum / perlu keputusan pemilik

- [ ] **Riwayat Git masih memuat kredensial lama** (kunci Firebase Admin & API key pada 2 commit awal, Agustus 2025; repo **publik**). Sudah dirotasi sehingga tidak lagi berbahaya, tetapi tetap ada di riwayat. Pembersihan (`git filter-repo`/BFG + force-push semua branch + koordinasi kolaborator) sengaja ditunda — keputusan yang harus diambil pemilik repo.
- [ ] **Verifikasi langsung ke Firebase sungguhan.** Jalur Auth/Firestore diuji dengan Firestore & Auth palsu di memori (logika kepemilikan, validasi, status HTTP). Uji dengan proyek/emulator Firebase nyata belum dijalankan di lingkungan pengembangan ini — lakukan satu putaran manual setelah mengisi kredensial (daftar → tambah lahan → analisis → hapus akun) dan pastikan `firestore.rules` ter-deploy (`firebase deploy --only firestore:rules`).
- [ ] **Verifikasi email & MFA** tidak diwajibkan (opsional di Firebase Auth).
- [ ] **CSP masih memakai `'unsafe-inline'` untuk script** (dibutuhkan skrip hidrasi Next.js tanpa nonce). CSP berbasis nonce adalah peningkatan lanjutan.
- [ ] **Rate limiter & cache per-instance.** Cukup untuk satu instance; untuk skala horizontal gunakan Redis/WAF.
- [ ] **Temuan `npm audit` yang tersisa (8: 3 moderate, 5 high)** — semuanya transitif dan tanpa perbaikan upstream yang kompatibel: `postcss` bawaan Next (hanya dipakai saat build), `@grpc/grpc-js` di SDK Firestore klien (tidak dipakai — klien hanya memakai Auth), `uuid` di `@google-cloud/storage`. Pantau lewat Dependabot.
- [ ] **Tile publik gratis** (OSM, OpenTopoMap) tidak dimaksudkan untuk lalu lintas tinggi — lihat [`data-sources.md`](./data-sources.md).

## Riwayat audit awal (Fase 2, branch `feature/sec-audit`)

| # | Temuan | Tingkat | Status |
|---|---|---|---|
| 1 | Private key Firebase Admin SDK asli + API key ter-commit di `README.md` pada 2 commit paling awal (`8f7b9e1a`, `f0a058a3`, Agustus 2025); repo publik → kredensial dianggap bocor | 🔴 Kritis | Dirotasi oleh pemilik repo di Firebase/GCP Console. Riwayat Git **belum dibersihkan** (lihat di atas) |
| 2 | `.gitignore` berbeda-beda antar branch; file kredensial GEE asli sempat tak terlindungi | 🟠 Tinggi | ✅ Diperbaiki — `.gitignore` dikonsolidasi |
| 3 | `server/firebaseAdmin.ts` men-`console.error` objek error SDK penuh (berisiko membocorkan potongan kredensial ke log) | 🟡 Rendah | ✅ Diperbaiki — hanya pesan error yang dilog, inisialisasi malas |
