import Link from "next/link"
import { Compass } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-6 text-center">
      <Compass className="h-12 w-12 text-emerald-700" aria-hidden />
      <h1 className="text-3xl font-bold tracking-tight text-emerald-950">Halaman tidak ditemukan</h1>
      <p className="max-w-md text-muted-foreground">Alamat yang Anda tuju tidak ada atau sudah dipindahkan.</p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/dashboard">Ke dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/maps">Buka peta</Link>
        </Button>
      </div>
    </main>
  )
}
