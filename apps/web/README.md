# apps/web — EcoSentra Frontend

Frontend Next.js (App Router, TypeScript) untuk EcoSentra, termasuk backend
API utama (Next.js API Routes di `app/api/*`).

## Menjalankan Lokal

```bash
cd apps/web
npm install
cp .env.local.example .env.local   # isi kredensial Firebase Anda
npm run dev
```

Buka [http://localhost:8080](http://localhost:8080) (lihat `scripts.dev` di
`package.json` untuk port).

## Struktur

```
apps/web/
├── app/              # Halaman (App Router) + app/api/* (Next.js API Routes)
├── components/       # Komponen React (components/ui/* = shadcn primitives)
├── lib/
│   ├── data/         # Data layer dashboard — lihat bagian di bawah
│   └── utils.ts      # Helper cn()
├── hooks/            # Custom hooks
└── server/           # Kode server-only (mis. server/firebaseAdmin.ts)
```

## Data Layer Dashboard (`lib/data/`)

Statistik di dashboard utama (`app/dashboard/page.tsx`) tidak fetch API
langsung dari komponen — semuanya lewat `lib/data/*.ts`:

- `lib/data/fields.ts` → `getFieldsSummary()`
- `lib/data/landcover.ts` → `getLandCoverStats()`
- `lib/data/fireHotspots.ts` → `getFireHotspotCount()`
- `lib/data/alerts.ts` → `getActiveAlertsCount()`
- `lib/data/types.ts` → bentuk data bersama (kontrak dengan backend)

**Saat ini semuanya MOCK** (delay `setTimeout` + data contoh) karena layanan
GEE (`services/geo`) dan ML masih dalam pengembangan. Komponen dashboard
memakai hook `hooks/use-dashboard-stat.ts` untuk loading/error state + retry,
independen per statistik.

### Cara Menyambungkan ke API Asli Nanti

1. Baca kontrak lengkap di [`docs/api-contracts.md`](../../docs/api-contracts.md)
   — bentuk response tiap endpoint sudah didefinisikan di sana, identik
   dengan interface di `lib/data/types.ts`.
2. Ganti isi fungsi di `lib/data/*.ts` terkait dari mock jadi `fetch()` ke
   endpoint asli (contoh ada di `docs/api-contracts.md`).
3. **Tidak ada komponen UI yang perlu diubah** — `app/dashboard/page.tsx`
   dan `hooks/use-dashboard-stat.ts` sudah generik terhadap sumber datanya.

## Halaman Lain

5 halaman lain (`app/fields`, `app/maps`, `app/disaster-alerts`,
`app/eco-services`, `app/decision-support`) masih memakai pola mock inline
lama (belum memakai `lib/data/`) — di luar cakupan pekerjaan dashboard ini,
lihat riwayat commit branch `feature/fe-dashboard` untuk detail audit.
