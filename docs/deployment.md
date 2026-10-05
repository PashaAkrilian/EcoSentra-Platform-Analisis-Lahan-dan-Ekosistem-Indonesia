# Deployment & Konfigurasi

Urutan yang disarankan: **(1)** jalankan lokal dalam mode demo, **(2)** aktifkan
login & penyimpanan (Firebase), **(3)** deploy `apps/web`, **(4)** opsional:
`services/geo`, LandAI penuh, MCP.

Semua variabel lingkungan `apps/web` dijelaskan di
[`apps/web/.env.local.example`](../apps/web/.env.local.example) dan **semuanya
opsional**.

## 1. Lokal, mode demo (tanpa kredensial)

Syarat: Node.js ≥ 22.12.

```bash
cd apps/web
npm ci
npm run dev          # http://localhost:8080
```

Peta, titik api, gempa, cuaca, NDVI, tutupan lahan (Esri), profil ekosistem,
peringatan otomatis, ekspor, dan LandAI mode aturan sudah berfungsi.
Panggilan pertama ke data titik api bisa 10–60 detik dari Indonesia (unduh CSV
NASA); setelah itu cache melayani.

Perintah berguna: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## 2. Mengaktifkan login & penyimpanan (Firebase)

1. Buat project di [Firebase Console](https://console.firebase.google.com/).
2. **Authentication → Sign-in method**: aktifkan *Email/Password* dan (opsional)
   *Google*. Tambahkan domain deploy Anda ke *Authorized domains*.
3. **Firestore Database**: buat database (mode produksi, region `asia-southeast2` Jakarta).
4. **Project settings → General → Your apps → Web app**: salin konfigurasi ke
   `apps/web/.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=…
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=…
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=…
   NEXT_PUBLIC_FIREBASE_APP_ID=…
   ```
5. **Project settings → Service accounts → Generate new private key** →
   isi `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
   (pertahankan `\n` literal di dalam nilai kunci). **Jangan commit file kunci.**
   Di Firebase App Hosting variabel ini tidak perlu (memakai Application Default Credentials).
6. Terapkan aturan keamanan (menolak semua akses klien langsung):
   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```
7. Buka `/settings` — semua integrasi yang Anda isi harus berstatus **Aktif**.

### Data contoh & peran admin {#memberi-peran-admin}

Daftar dulu lewat `/login`, ambil **UID** akun itu (Firebase Console → Authentication → Users), lalu:

```bash
cd apps/web
npm run seed -- <uid>            # 3 lahan + 2 skenario contoh untuk akun itu
npm run seed -- <uid> --admin    # + jadikan admin & buat 1 peringatan contoh
```

Peran admin (custom claim `admin: true`) baru berlaku setelah pengguna
**keluar dan masuk lagi**. Admin dapat menerbitkan/menghapus peringatan kurasi
di halaman Peringatan Bencana.

### Pengembangan lokal dengan Firebase Emulator (tanpa project sungguhan)

Cocok untuk mencoba login, lahan, skenario, dan peran admin tanpa akun Firebase.
Butuh Java (untuk emulator Firestore) dan `firebase-tools`:

```bash
# terminal 1 — dari root repo (memakai firebase.emulators.json + firestore.rules)
npx firebase-tools emulators:start --config firebase.emulators.json \
  --only auth,firestore --project demo-ecosentra

# terminal 2
cd apps/web
cat > .env.local <<'EOT'
NEXT_PUBLIC_FIREBASE_API_KEY=fake-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-ecosentra
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_PROJECT_ID=demo-ecosentra
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
METADATA_SERVER_DETECTION=none
EOT
npm run dev
```

Daftar lewat `/login` (email & kata sandi bebas). Untuk data contoh dan peran admin,
ambil UID dari respons emulator lalu jalankan
`FIREBASE_PROJECT_ID=demo-ecosentra FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node scripts/seedFirestore.mjs <uid> --admin`.
Data emulator hilang saat emulator dihentikan.

> **Permintaan Firestore pertama lambat?** Wajar: SDK memuat protobuf (beberapa detik pada
> mesin lambat) dan, di luar GCP, mencari kredensial lewat metadata server. Baris
> `METADATA_SERVER_DETECTION=none` di atas melewati pencarian itu; hanya untuk emulator —
> jangan dipakai di server sungguhan.
>
> **Kenapa `--config firebase.emulators.json`?** `firebase.json` memuat `hosting.source`
> (App Hosting/Next.js). Selama blok itu ada, `firebase-tools` selalu mencoba membangun
> aplikasi web saat emulator dijalankan — dan gagal kecuali eksperimen `webframeworks`
> aktif. File khusus emulator hanya berisi aturan Firestore + port emulator.

## 3. Deploy `apps/web`

### Firebase App Hosting (disarankan — repo sudah menyertakan `firebase.json`)

```bash
npm i -g firebase-tools && firebase login
firebase deploy --only hosting      # sumber: apps/web, region asia-southeast2
```

Variabel lingkungan produksi diatur di Firebase Console (App Hosting → Environment)
atau lewat `apphosting.yaml`; rahasia (`FIREBASE_PRIVATE_KEY`, `ANTHROPIC_API_KEY`)
sebaiknya lewat Cloud Secret Manager.

### Platform lain (Cloud Run, VPS, Docker)

`next build && next start -p $PORT` dengan Node ≥ 22.12. Pastikan:

- semua variabel `NEXT_PUBLIC_*` diset **saat build** (nilainya ikut tertanam di JS klien);
- proses punya akses jaringan keluar ke `firms.modaps.eosdis.nasa.gov`, `data.bmkg.go.id`,
  `ic.imagery1.arcgis.com`, `modis.ornl.gov`, `api.open-meteo.com`;
- di belakang reverse proxy, teruskan `X-Forwarded-For` (dipakai rate limit per IP)
  dan jangan mem-buffer respons `/api/chat` (streaming).

### Catatan skala

Cache dan rate limit bersifat **in-memory per instance**. Satu instance sudah
memadai untuk beban moderat. Untuk beberapa instance: gunakan penyimpanan
bersama (Redis) atau pindahkan rate limit ke CDN/WAF; cache sumber data tetap
aman (tiap instance memanaskan sendiri).

## 4. Opsional

### Tutupan lahan ESA WorldCover (`services/geo`)

Tanpa ini aplikasi memakai Esri 10 m (sudah cukup untuk kebanyakan kasus).

```bash
cd services/geo
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env     # isi GEE_SERVICE_ACCOUNT + GEE_KEY_PATH, dan GEO_API_KEY
python check_gee.py      # harus mencetak "GEE OK"
uvicorn app.main:app --port 8001
```

Deploy: `Dockerfile` siap pakai (Cloud Run, Railway, Hugging Face Spaces). Di
platform tanpa filesystem persisten isi `GEE_CREDENTIALS_JSON` (isi JSON key).
**Set `GEO_API_KEY`** pada layanan publik, lalu di `apps/web` isi
`GEO_SERVICE_URL=https://…` (dan `GEO_SERVICE_API_KEY` bila dipakai) — tanpa
API key siapa pun yang tahu URL-nya bisa menghabiskan kuota Earth Engine Anda.

### LandAI penuh (Claude)

Isi `ANTHROPIC_API_KEY` di `apps/web`. Model default `claude-opus-5-5`; ganti lewat
`ANTHROPIC_MODEL` (mis. `claude-sonnet-5-5` atau `claude-haiku-4-5` untuk biaya lebih rendah).
Dengan Firebase aktif, mode ini hanya untuk pengguna login (batas 8 permintaan/menit/IP
dan 150/hari/pengguna). Tanpa kunci, LandAI tetap berjalan dalam mode aturan.

### MCP server untuk asisten AI eksternal

```bash
cd services/mcp
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
ECOSENTRA_API_URL=https://ecosentra.example.com python server.py
```

Contoh konfigurasi Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ecosentra": {
      "command": "/path/ke/services/mcp/.venv/bin/python",
      "args": ["/path/ke/services/mcp/server.py"],
      "env": { "ECOSENTRA_API_URL": "https://ecosentra.example.com" }
    }
  }
}
```

## Pemecahan masalah

| Gejala | Penyebab & solusi |
|---|---|
| Titik api "fetch failed" / timeout | server jauh dari AS: naikkan `NET_ATTEMPT_TIMEOUT_MS`; cek firewall keluar ke `firms.modaps.eosdis.nasa.gov` |
| Login Google gagal "unauthorized domain" | tambahkan domain ke Firebase Auth → Authorized domains |
| `/api/fields` → 503 | variabel `FIREBASE_*` (Admin SDK) belum diisi |
| `/api/fields` → 401 padahal sudah login | jam server menyimpang jauh (verifikasi token gagal) atau project Firebase klien ≠ server |
| Admin tidak bisa menerbitkan peringatan | claim baru berlaku setelah keluar-masuk lagi; cek `npm run seed -- <uid> --admin` sukses |
| Peta kosong / tile gagal | blokir CSP/jaringan ke host tile; lihat `next.config.mjs` (`img-src https:`) |
