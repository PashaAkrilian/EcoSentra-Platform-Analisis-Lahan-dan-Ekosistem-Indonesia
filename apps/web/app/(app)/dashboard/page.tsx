"use client"

import type { ReactNode } from "react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Leaf,
  LayoutDashboard,
  MapPin,
  Settings,
  HelpCircle,
  Home,
  Map,
  AlertTriangle,
  TreePine,
  Brain,
  Layers,
  Flame,
  Upload,
  MessageCircle,
} from "lucide-react"
import Link from "next/link"
import { AskLandAI } from "@/components/ask-land-ai"
import { useDashboardStat } from "@/hooks/use-dashboard-stat"
import { getFieldsSummary, getLandCoverStats, getFireHotspotCount, getActiveAlertsCount } from "@/lib/data"

function StatCard({
  icon,
  iconBg,
  label,
  isLoading,
  error,
  onRetry,
  subtitle,
  children,
}: {
  icon: ReactNode
  iconBg: string
  label: string
  isLoading: boolean
  error: string | null
  onRetry: () => void
  subtitle?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            {isLoading ? (
              <Skeleton className="h-9 w-24 mt-1" />
            ) : error ? (
              <div className="mt-1">
                <p className="text-sm text-red-600">Gagal memuat data</p>
                <button onClick={onRetry} className="text-xs text-blue-600 underline mt-1">
                  Coba lagi
                </button>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-800">{children}</p>
                {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
              </>
            )}
          </div>
          <div className={`p-3 rounded-full shrink-0 ${iconBg}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatDate = (date: Date) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ]
    return {
      dayName: days[date.getDay()],
      fullDate: `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`,
      time: date.toLocaleTimeString("id-ID", { hour12: false }),
    }
  }

  const dateInfo = formatDate(currentTime)

  const fields = useDashboardStat(getFieldsSummary)
  const landCover = useDashboardStat(getLandCoverStats)
  const fireHotspots = useDashboardStat(getFireHotspotCount)
  const alerts = useDashboardStat(getActiveAlertsCount)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-emerald-50 via-teal-50 to-cyan-50 flex flex-col min-h-screen shadow-2xl border-r border-emerald-200/50 relative">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-400 to-teal-600"></div>
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3 p-6 pb-4 border-b border-emerald-200/30 bg-white/20 backdrop-blur-sm">
          <div className="p-2 bg-emerald-500 rounded-lg shadow-lg">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-emerald-800 tracking-wide">EcoSentra</span>
        </div>

        <nav className="relative z-10 space-y-1 px-4 flex-1 py-6">
          <Button
            variant="secondary"
            className="w-full justify-start bg-white/80 text-emerald-800 shadow-lg border border-emerald-200/50 hover:bg-white/90 hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
          >
            <LayoutDashboard className="w-4 h-4 mr-3" />
            Dashboard
          </Button>
          <Link href="/fields">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/40 hover:shadow-md transition-all duration-300 hover:translate-x-1"
            >
              <MapPin className="w-4 h-4 mr-3" />
              My Fields
            </Button>
          </Link>
          <Link href="/maps">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/40 hover:shadow-md transition-all duration-300 hover:translate-x-1"
            >
              <Map className="w-4 h-4 mr-3" />
              Maps & Export
            </Button>
          </Link>
          <Link href="/disaster-alerts">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/40 hover:shadow-md transition-all duration-300 hover:translate-x-1"
            >
              <AlertTriangle className="w-4 h-4 mr-3" />
              Disaster Alerts
            </Button>
          </Link>
          <Link href="/eco-services">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/40 hover:shadow-md transition-all duration-300 hover:translate-x-1"
            >
              <TreePine className="w-4 h-4 mr-3" />
              Eco Services
            </Button>
          </Link>
          <Link href="/decision-support">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/40 hover:shadow-md transition-all duration-300 hover:translate-x-1"
            >
              <Brain className="w-4 h-4 mr-3" />
              Decision Support
            </Button>
          </Link>
          <Link href="/">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/40 hover:shadow-md transition-all duration-300 hover:translate-x-1"
            >
              <Home className="w-4 h-4 mr-3" />
              Main Menu
            </Button>
          </Link>
        </nav>

        <div className="relative z-10 space-y-1 px-4 pb-6 border-t border-emerald-200/30 pt-4 bg-white/10 backdrop-blur-sm">
          <Button
            variant="ghost"
            className="w-full justify-start text-emerald-700 hover:bg-white/40 hover:shadow-md transition-all duration-300 hover:translate-x-1"
          >
            <Settings className="w-4 h-4 mr-3" />
            Settings
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-emerald-700 hover:bg-white/40 hover:shadow-md transition-all duration-300 hover:translate-x-1"
          >
            <HelpCircle className="w-4 h-4 mr-3" />
            Help Center
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-600 mt-1">Ringkasan pemantauan lahan dan ekosistem Anda</p>
          </div>
          <div className="flex items-center gap-6 text-gray-600">
            <div className="text-right">
              <div className="font-medium">{dateInfo.dayName}</div>
              <div className="text-sm">{dateInfo.fullDate}</div>
              <div className="text-xs text-blue-600">{dateInfo.time}</div>
            </div>
            <div className="flex items-center gap-2 bg-emerald-100 px-4 py-2 rounded-xl shadow-md border border-emerald-200">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-emerald-800">Indonesia</span>
            </div>
          </div>
        </div>

        {/* Ringkasan Statistik */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<MapPin className="w-6 h-6 text-green-600" />}
            iconBg="bg-green-100"
            label="Total Lahan Dipantau"
            isLoading={fields.isLoading}
            error={fields.error}
            onRetry={fields.retry}
            subtitle={fields.data ? `${fields.data.totalAreaHa.toFixed(1)} ha total` : undefined}
          >
            {fields.data?.totalFields}
          </StatCard>

          <StatCard
            icon={<Layers className="w-6 h-6 text-blue-600" />}
            iconBg="bg-blue-100"
            label="Area Terklasifikasi"
            isLoading={landCover.isLoading}
            error={landCover.error}
            onRetry={landCover.retry}
            subtitle={landCover.data ? `Dominan: ${landCover.data.dominantClass}` : undefined}
          >
            {landCover.data ? `${landCover.data.totalAreaClassifiedHa.toFixed(1)} ha` : undefined}
          </StatCard>

          <StatCard
            icon={<Flame className="w-6 h-6 text-orange-600" />}
            iconBg="bg-orange-100"
            label="Titik Api (24 jam)"
            isLoading={fireHotspots.isLoading}
            error={fireHotspots.error}
            onRetry={fireHotspots.retry}
            subtitle={fireHotspots.data ? `${fireHotspots.data.last7d} dalam 7 hari` : undefined}
          >
            {fireHotspots.data?.last24h}
          </StatCard>

          <StatCard
            icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
            iconBg="bg-red-100"
            label="Alert Aktif"
            isLoading={alerts.isLoading}
            error={alerts.error}
            onRetry={alerts.retry}
            subtitle={alerts.data ? `${alerts.data.bySeverity.high} prioritas tinggi` : undefined}
          >
            {alerts.data?.total}
          </StatCard>
        </div>

        {/* Akses Cepat */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Akses Cepat</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/maps" className="h-full">
            <Card className="h-full bg-white/80 backdrop-blur-sm shadow-xl border border-white/50 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Map className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Peta & Analisis Lahan</h3>
                  <p className="text-sm text-gray-500 mt-1">Peta interaktif, titik api, dan tutupan lahan</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="h-full bg-white/50 backdrop-blur-sm shadow-md border border-white/50 opacity-75">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-gray-100 rounded-full">
                <Upload className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Upload Data</h3>
                <p className="text-sm text-gray-500 mt-1">Unggah data lahan sendiri untuk dianalisis</p>
                <Badge variant="secondary" className="mt-2">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full bg-white/50 backdrop-blur-sm shadow-md border border-white/50 opacity-75">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-gray-100 rounded-full">
                <MessageCircle className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Asisten AI (LandAI)</h3>
                <p className="text-sm text-gray-500 mt-1">Sudah aktif — klik ikon chat di pojok kanan bawah</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AskLandAI />
    </div>
  )
}
