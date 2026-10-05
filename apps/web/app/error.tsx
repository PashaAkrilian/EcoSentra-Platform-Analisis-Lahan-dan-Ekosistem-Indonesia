"use client"

import { useEffect } from "react"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Kesalahan halaman:", error.digest ?? error.message)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <TriangleAlert className="h-12 w-12 text-red-700" aria-hidden />
      <h1 className="text-2xl font-bold tracking-tight">Terjadi kesalahan</h1>
      <p className="max-w-md text-muted-foreground">Halaman ini gagal dimuat. Coba muat ulang; kalau berulang, kembali ke dashboard.</p>
      <div className="flex gap-2">
        <Button onClick={reset}>Coba lagi</Button>
        <Button asChild variant="outline">
          <a href="/dashboard">Ke dashboard</a>
        </Button>
      </div>
    </main>
  )
}
