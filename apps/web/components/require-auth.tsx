"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { LogIn, ServerOff } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { PageHeader } from "@/components/page-header"
import { EmptyState, LoadingLines } from "@/components/status"
import { Button } from "@/components/ui/button"

/**
 * Pembungkus halaman yang butuh akun. Menangani tiga keadaan non-login:
 * mode demo (Firebase belum dikonfigurasi), status login belum diketahui,
 * dan belum login. Kalau `title` diberikan, judul halaman tetap tampil di ketiganya.
 */
export function RequireAuth({ feature, title, children }: { feature: string; title?: string; children: ReactNode }) {
  const { configured, user, loading } = useAuth()
  const pathname = usePathname()

  if (configured && !loading && user) return <>{children}</>

  return (
    <>
      {title && <PageHeader title={title} />}
      {!configured ? (
        <EmptyState icon={ServerOff} title={`${feature} belum aktif`}>
          Instalasi ini berjalan dalam <strong>mode demo</strong> tanpa login, sehingga data pribadi tidak disimpan. Semua
          data publik (peta, titik api, gempa, cuaca, NDVI) tetap tersedia penuh. Pemilik instalasi dapat mengaktifkan
          login dengan mengisi variabel Firebase — lihat{" "}
          <Link href="/help#mode-demo" className="font-medium text-emerald-800 underline underline-offset-2">
            Bantuan
          </Link>
          .
        </EmptyState>
      ) : loading ? (
        <LoadingLines rows={4} />
      ) : (
        <EmptyState
          icon={LogIn}
          title="Masuk untuk melanjutkan"
          action={
            <Button asChild>
              <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Masuk / Daftar</Link>
            </Button>
          }
        >
          {feature} tersimpan di akun Anda dan hanya dapat dilihat oleh Anda.
        </EmptyState>
      )}
    </>
  )
}
