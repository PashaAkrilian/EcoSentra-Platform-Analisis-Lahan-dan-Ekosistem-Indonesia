# Laporan Cleanup Unused Files/Dependencies — `chore/cleanup-unused`

Dikerjakan di branch `chore/cleanup-unused` (dari `develop`). Dokumen ini
meringkas apa yang dihapus, kenapa, dan item yang **sengaja tidak disentuh**
karena statusnya belum pasti.

## Metodologi

Untuk tiap kandidat, dicek: import langsung (`app/**`, top-level
`components/*.tsx`), import antar-file (mis. `sidebar.tsx` mengimpor
`separator`/`tooltip`), apakah komponennya benar-benar **dirender** (bukan
cuma didefinisikan), semua `import()` dinamis di repo (cuma satu, untuk
`leaflet-map.tsx`, tidak terkait), dan cross-check ke 6 branch feature lain
yang belum merge ke `develop` (`feature/fe-dashboard`,
`feature/fe-peta-zoom-label`, `feature/sec-audit`, `feature/be-landcover-gee`,
`feature/mcp-landcover`, `feature/ml-segformer-run-01`) — penting karena
banyak kerja proyek ini tersebar di branch yang belum merge.

## Yang Dihapus

**File (5 commit terpisah):**
1. `components/ui/use-toast.ts`, `components/ui/use-mobile.tsx` — duplikat
   persis dari `hooks/use-toast.ts` / `hooks/use-mobile.tsx` (yang asli &
   dipakai), tidak direferensikan dari lokasi ini.
2. `components/ui/toast.tsx`, `components/ui/toaster.tsx`,
   `components/ui/sonner.tsx`, `hooks/use-toast.ts` — sistem notifikasi
   toast yang tidak pernah disambungkan (`<Toaster/>` tidak pernah dipasang
   di `app/layout.tsx`, `toast()` tidak pernah dipanggil di mana pun).
3. `components/ui/sidebar.tsx`, `hooks/use-mobile.tsx` — sidebar shadcn yang
   tidak dipakai; sidebar asli di tiap halaman (`dashboard`,
   `disaster-alerts`, `fields`, `maps`) ternyata hand-rolled markup.
4. `components/theme-provider.tsx` — wrapper `next-themes`, tidak pernah
   di-mount di `app/layout.tsx` atau mana pun.
5. 31 komponen shadcn primitif berdiri sendiri, nol pemakaian di `develop`
   maupun ke-6 branch lain: `accordion, alert, alert-dialog, aspect-ratio,
   avatar, breadcrumb, calendar, carousel, chart, checkbox, collapsible,
   command, context-menu, drawer, dropdown-menu, form, hover-card,
   input-otp, menubar, navigation-menu, pagination, popover, radio-group,
   resizable, separator, slider, switch, table, toggle, toggle-group,
   tooltip`. Menghapus `chart.tsx` juga menghilangkan 7 error TypeScript
   lama (mismatch versi `recharts`) yang ditemukan saat setup CI
   (`chore/ci-setup`) — `tsc --noEmit` sekarang bersih total (exit 0).

**Dependency (`apps/web/package.json`, 1 commit):** 33 package —
`@hookform/resolvers`, 20 `@radix-ui/react-*` (accordion, alert-dialog,
aspect-ratio, avatar, checkbox, collapsible, context-menu, dropdown-menu,
hover-card, menubar, navigation-menu, popover, radio-group, separator,
slider, switch, toast, toggle, toggle-group, tooltip), `cmdk`, `date-fns`,
`embla-carousel-react`, `geist`, `input-otp`, `next-themes`,
`react-day-picker`, `react-hook-form`, `react-resizable-panels`, `recharts`,
`sonner`, `vaul`. 327 package terhapus dari `node_modules` setelah
`npm install` ulang.

**Verifikasi setiap kelompok:** `tsc --noEmit` dijalankan setelah tiap commit
penghapusan — semuanya bersih (tidak ada yang rusak). `npm run lint` tidak
bisa diverifikasi di branch ini karena `.eslintrc.json` belum ada di
`develop` (baru ada di branch `chore/ci-setup` yang belum merge) — bukan
regresi dari cleanup ini.

## Yang SENGAJA TIDAK Dihapus (perlu keputusan manual)

| Item | Kenapa tidak dihapus sekarang |
|---|---|
| `zod` (dependency) | Nol pemakaian di `develop`, tapi **aktif dipakai** di `feature/sec-audit` (`lib/validation.ts` + 9 route API). Menghapus di sini berisiko konflik/regresi saat branch itu merge. |
| `components/ui/skeleton.tsx` | Nol pemakaian di `develop`, tapi dipakai langsung di `dashboard/page.tsx` versi rework di `feature/fe-dashboard` (belum merge). Risiko sama seperti zod. |
| `lib/firebaseClient.ts` + dependency `firebase` (client SDK) | Nol pemakaian di semua branch, tapi `.env.local.example` punya komentar eksplisit yang menyiapkan ini untuk Firebase Client SDK di frontend — kemungkinan sengaja disiapkan untuk nanti, bukan sisa lupa hapus. |
| `apps/web/scripts/seedFirestore.js` vs `seedFirestore.ts` | Dua file beda (bukan duplikat: 242 baris CommonJS vs 145 baris TypeScript), tidak direferensikan di `package.json` scripts/dokumentasi. Belum di-diff baris-per-baris untuk memastikan tidak ada logic yang cuma ada di salah satunya. |

**Catatan untuk cleanup berikutnya:** begitu `feature/sec-audit` dan/atau
`feature/fe-dashboard` merge ke `develop`, re-audit ulang status `zod` dan
`skeleton.tsx` — kemungkinan besar saat itu keduanya jadi terpakai beneran
dan tidak perlu didaftar lagi sebagai "tidak yakin".
