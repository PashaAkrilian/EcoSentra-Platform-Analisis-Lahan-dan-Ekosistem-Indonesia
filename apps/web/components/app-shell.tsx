"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, type ReactNode } from "react"
import {
  AlertTriangle,
  Brain,
  HelpCircle,
  LayoutDashboard,
  Leaf,
  LogIn,
  LogOut,
  Map,
  MapPin,
  Menu,
  Settings,
  TreePine,
} from "lucide-react"
import { AssistantProvider } from "@/components/assistant-context"
import { useAuth } from "@/components/auth-provider"
import { AskLandAI } from "@/components/ask-land-ai"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const MAIN_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/maps", label: "Peta & Analisis", icon: Map },
  { href: "/fields", label: "Lahan Saya", icon: MapPin },
  { href: "/disaster-alerts", label: "Peringatan Bencana", icon: AlertTriangle },
  { href: "/ecosystem", label: "Profil Ekosistem", icon: TreePine },
  { href: "/decision-support", label: "Pendukung Keputusan", icon: Brain },
]

const SECONDARY_NAV = [
  { href: "/settings", label: "Pengaturan", icon: Settings },
  { href: "/help", label: "Bantuan & Metodologi", icon: HelpCircle },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const renderItem = ({ href, label, icon: Icon }: (typeof MAIN_NAV)[number]) => {
    const active = pathname === href || pathname.startsWith(`${href}/`)
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-emerald-700 text-white shadow-sm" : "text-emerald-950/80 hover:bg-emerald-100 hover:text-emerald-950",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {label}
      </Link>
    )
  }

  return (
    <div className="flex flex-1 flex-col justify-between gap-6">
      <nav aria-label="Navigasi utama" className="space-y-1">
        {MAIN_NAV.map(renderItem)}
      </nav>
      <nav aria-label="Navigasi tambahan" className="space-y-1 border-t border-emerald-900/10 pt-4">
        {SECONDARY_NAV.map(renderItem)}
      </nav>
    </div>
  )
}

function UserBox({ onNavigate }: { onNavigate?: () => void }) {
  const { configured, user, loading, signOut } = useAuth()

  if (!configured) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
        <strong>Mode demo.</strong> Login & penyimpanan data belum dikonfigurasi. Data publik tetap tersedia.
      </p>
    )
  }
  if (loading) {
    return <div className="h-10 animate-pulse rounded-lg bg-emerald-100" aria-label="Memuat status login" />
  }
  if (!user) {
    return (
      <Button asChild className="w-full" onClick={onNavigate}>
        <Link href="/login">
          <LogIn aria-hidden /> Masuk / Daftar
        </Link>
      </Button>
    )
  }
  const name = user.displayName || user.email?.split("@")[0] || "Pengguna"
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/70 px-3 py-2 ring-1 ring-emerald-900/10">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white"
        aria-hidden
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-emerald-950">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => signOut()} title="Keluar">
        <LogOut aria-hidden />
        <span className="sr-only">Keluar</span>
      </Button>
    </div>
  )
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="EcoSentra — beranda">
      <span className="rounded-lg bg-emerald-700 p-1.5 shadow-sm">
        <Leaf className="h-5 w-5 text-white" aria-hidden />
      </span>
      <span className="text-lg font-bold tracking-tight text-emerald-950">EcoSentra</span>
    </Link>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const close = () => setMobileOpen(false)

  return (
    <AssistantProvider>
      <div className="min-h-screen lg:flex">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-emerald-900/10 bg-emerald-50/70 p-4 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <div className="px-2 pt-2">
            <Brand />
          </div>
          <NavLinks />
          <UserBox />
        </aside>

        {/* Top bar mobile */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-emerald-900/10 bg-emerald-50/95 px-4 py-3 backdrop-blur lg:hidden">
          <Brand />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Buka menu">
                <Menu aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col gap-6 bg-emerald-50 p-4">
              <SheetTitle className="px-2 pt-2">
                <Brand />
              </SheetTitle>
              <NavLinks onNavigate={close} />
              <UserBox onNavigate={close} />
            </SheetContent>
          </Sheet>
        </header>

        <main id="konten" className="min-w-0 flex-1">
          {children}
        </main>

        <AskLandAI />
      </div>
    </AssistantProvider>
  )
}
