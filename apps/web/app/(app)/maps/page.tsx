"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
  Download,
  Layers,
  Satellite,
  RefreshCw,
  Globe,
  Activity,
  Thermometer,
} from "lucide-react"
import Link from "next/link"
import { AskLandAI } from "@/components/ask-land-ai"

// Dynamically import the map component to avoid SSR issues
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex items-center justify-center min-h-[600px]">
      <div className="text-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🇮🇩</span>
          </div>
        </div>
        <p className="text-gray-700 font-medium">Loading Indonesia Map...</p>
        <p className="text-sm text-gray-500 mt-2">Peta Indonesia dengan data real-time</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
          <span>🗺️ Indonesia Focus</span>
          <span>•</span>
          <span>🏙️ Major Cities</span>
          <span>•</span>
          <span>🔥 Fire Data</span>
        </div>
      </div>
    </div>
  ),
})

interface LandCoverData {
  type: string
  area: string
  percentage: number
  color: string
}

interface FireData {
  latitude: number
  longitude: number
  brightness: number
  confidence: number
  acq_date: string
}

interface WeatherData {
  temperature: number
  humidity: number
  description: string
}

export default function MapsExport() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedLayer, setSelectedLayer] = useState("satellite")
  const [selectedDate, setSelectedDate] = useState("2025-01-29")
  const [exportFormat, setExportFormat] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [landCoverData, setLandCoverData] = useState<LandCoverData[]>([])
  const [fireData, setFireData] = useState<FireData[]>([])
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Load initial data - focused on Indonesia classification
  useEffect(() => {
    loadIndonesianLandCoverData()
    loadIndonesianFireData()
    loadIndonesianWeatherData()
  }, [selectedDate])

  const formatDate = (date: Date) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ]

    return {
      dayName: days[date.getDay()],
      fullDate: `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`,
      time: date.toLocaleTimeString("id-ID", { hour12: false }),
    }
  }

  const dateInfo = formatDate(currentTime)

  const layers = [
    {
      id: "landcover",
      name: "Tutupan Lahan Indonesia",
      color: "bg-green-500",
      description: "Hutan, pertanian, perkotaan",
      icon: <Map className="w-4 h-4" />,
      source: "CartoDB + OpenStreetMap",
    },
    {
      id: "satellite",
      name: "Citra Satelit Indonesia",
      color: "bg-blue-500",
      description: "Resolusi tinggi Indonesia",
      icon: <Satellite className="w-4 h-4" />,
      source: "Esri World Imagery",
    },
    {
      id: "terrain",
      name: "Topografi Indonesia",
      color: "bg-orange-500",
      description: "Gunung, lembah, dataran",
      icon: <Activity className="w-4 h-4" />,
      source: "OpenTopoMap",
    },
    {
      id: "ndvi",
      name: "Indeks Vegetasi Indonesia",
      color: "bg-emerald-500",
      description: "Kesehatan vegetasi Indonesia",
      icon: <TreePine className="w-4 h-4" />,
      source: "Stamen Terrain",
    },
    {
      id: "temperature",
      name: "Suhu Permukaan Indonesia",
      color: "bg-red-500",
      description: "Data termal Indonesia",
      icon: <Thermometer className="w-4 h-4" />,
      source: "CartoDB Dark",
    },
    {
      id: "fires",
      name: "Titik Api Indonesia",
      color: "bg-red-600",
      description: "Deteksi kebakaran Indonesia",
      icon: <AlertTriangle className="w-4 h-4" />,
      source: "NASA FIRMS + OpenStreetMap",
    },
  ]

  const exportFormats = [
    { id: "geotiff", name: "GeoTIFF", extension: ".tif", description: "Format data raster" },
    { id: "shapefile", name: "Shapefile", extension: ".shp", description: "Format data vektor" },
    { id: "geojson", name: "GeoJSON", extension: ".geojson", description: "Format web-friendly" },
    { id: "kml", name: "KML", extension: ".kml", description: "Format Google Earth" },
    { id: "csv", name: "CSV", extension: ".csv", description: "Format data tabular" },
  ]

  const loadIndonesianLandCoverData = async () => {
    setIsLoading(true)
    try {
      // Simulate API call for Indonesian land cover data
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const indonesianLandCoverData: LandCoverData[] = [
        { type: "Hutan Primer", area: "920,000 km²", percentage: 48.2, color: "#0f5132" },
        { type: "Hutan Sekunder", area: "340,000 km²", percentage: 17.8, color: "#198754" },
        { type: "Lahan Pertanian", area: "380,000 km²", percentage: 19.9, color: "#ffc107" },
        { type: "Kawasan Perkotaan", area: "85,000 km²", percentage: 4.5, color: "#6c757d" },
        { type: "Perairan", area: "120,000 km²", percentage: 6.3, color: "#0dcaf0" },
        { type: "Padang Rumput", area: "65,000 km²", percentage: 3.4, color: "#20c997" },
      ]

      setLandCoverData(indonesianLandCoverData)
    } catch (error) {
      console.error("Error loading Indonesian land cover data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadIndonesianFireData = async () => {
    try {
      // Simulate NASA FIRMS API call with realistic Indonesian fire locations only
      await new Promise((resolve) => setTimeout(resolve, 500))

      const indonesianFireData: FireData[] = [
        // Sumatra fires (Riau, Jambi, South Sumatra - peat fires)
        { latitude: -0.5, longitude: 101.4, brightness: 325.8, confidence: 89, acq_date: "2025-01-29" },
        { latitude: -1.8, longitude: 103.2, brightness: 312.4, confidence: 85, acq_date: "2025-01-29" },
        { latitude: -2.1, longitude: 104.1, brightness: 298.7, confidence: 78, acq_date: "2025-01-29" },
        { latitude: -1.2, longitude: 102.8, brightness: 334.2, confidence: 92, acq_date: "2025-01-29" },
        { latitude: -0.8, longitude: 100.9, brightness: 289.5, confidence: 76, acq_date: "2025-01-29" },

        // Central Kalimantan fires (peat and forest fires)
        { latitude: -2.2, longitude: 113.9, brightness: 345.7, confidence: 94, acq_date: "2025-01-29" },
        { latitude: -1.8, longitude: 114.8, brightness: 318.3, confidence: 87, acq_date: "2025-01-29" },
        { latitude: -3.1, longitude: 115.2, brightness: 301.9, confidence: 82, acq_date: "2025-01-29" },
        { latitude: -2.8, longitude: 112.5, brightness: 327.6, confidence: 90, acq_date: "2025-01-29" },

        // East Kalimantan fires
        { latitude: -1.5, longitude: 116.8, brightness: 315.4, confidence: 88, acq_date: "2025-01-29" },
        { latitude: -0.9, longitude: 117.3, brightness: 295.2, confidence: 79, acq_date: "2025-01-29" },

        // West Kalimantan fires
        { latitude: -0.3, longitude: 109.8, brightness: 308.7, confidence: 84, acq_date: "2025-01-29" },
        { latitude: -1.1, longitude: 110.4, brightness: 322.1, confidence: 91, acq_date: "2025-01-29" },

        // Central Sulawesi fires
        { latitude: -1.2, longitude: 120.1, brightness: 291.8, confidence: 77, acq_date: "2025-01-29" },
        { latitude: -0.8, longitude: 119.7, brightness: 305.3, confidence: 83, acq_date: "2025-01-29" },

        // Papua fires (forest and grassland)
        { latitude: -3.8, longitude: 138.5, brightness: 287.4, confidence: 74, acq_date: "2025-01-29" },
        { latitude: -4.2, longitude: 139.1, brightness: 312.9, confidence: 86, acq_date: "2025-01-29" },
        { latitude: -2.9, longitude: 140.2, brightness: 298.6, confidence: 80, acq_date: "2025-01-29" },

        // Java fires (agricultural burning - fewer but present)
        { latitude: -7.8, longitude: 110.4, brightness: 285.2, confidence: 73, acq_date: "2025-01-29" },
        { latitude: -6.9, longitude: 108.2, brightness: 279.8, confidence: 71, acq_date: "2025-01-29" },

        // Nusa Tenggara fires (savanna fires)
        { latitude: -8.2, longitude: 117.8, brightness: 293.5, confidence: 78, acq_date: "2025-01-29" },
        { latitude: -8.8, longitude: 119.2, brightness: 301.2, confidence: 81, acq_date: "2025-01-29" },
      ]

      setFireData(indonesianFireData)
    } catch (error) {
      console.error("Error loading Indonesian fire data:", error)
    }
  }

  const loadIndonesianWeatherData = async () => {
    try {
      // Simulate Indonesian weather data
      const indonesianWeatherData: WeatherData = {
        temperature: 28.5,
        humidity: 78,
        description: "Berawan sebagian",
      }

      setWeatherData(indonesianWeatherData)
    } catch (error) {
      console.error("Error loading Indonesian weather data:", error)
    }
  }

  const handleExport = async () => {
    if (!exportFormat) return

    setIsExporting(true)
    setExportProgress(0)

    // Simulate export progress
    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsExporting(false)
          // Simulate download
          const blob = new Blob([`Data Tutupan Lahan Indonesia - ${selectedLayer} - ${selectedDate}`], {
            type: "text/plain",
          })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `indonesia_${selectedLayer}_${selectedDate}.${exportFormats.find((f) => f.id === exportFormat)?.extension.slice(1)}`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          return 100
        }
        return prev + 10
      })
    }, 300)
  }

  const refreshData = () => {
    loadIndonesianLandCoverData()
    loadIndonesianFireData()
    loadIndonesianWeatherData()
  }

  const handleMapClick = (lat: number, lng: number) => {
    setClickedCoords({ lat, lng })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex">
      {/* Enhanced Sidebar */}
      <div className="w-64 bg-gradient-to-b from-emerald-50 via-teal-50 to-cyan-50 flex flex-col min-h-screen shadow-2xl border-r border-emerald-200/50 relative">
        {/* Decorative background pattern */}
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

        {/* Header with enhanced styling */}
        <div className="relative z-10 flex items-center gap-3 p-6 pb-4 border-b border-emerald-200/30 bg-white/20 backdrop-blur-sm">
          <div className="p-2 bg-emerald-500 rounded-lg shadow-lg">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-emerald-800 tracking-wide">EcoSentra</span>
        </div>

        {/* Main Navigation */}
        <nav className="relative z-10 space-y-1 px-4 flex-1 py-6">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/40 hover:shadow-md transition-all duration-300 hover:translate-x-1"
            >
              <LayoutDashboard className="w-4 h-4 mr-3" />
              Dashboard
            </Button>
          </Link>
          <Link href="/fields">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/40 hover:shadow-md transition-all duration-300 hover:translate-x-1"
            >
              <MapPin className="w-4 h-4 mr-3" />
              My Fields
            </Button>
          </Link>
          <Button
            variant="secondary"
            className="w-full justify-start bg-white/80 text-emerald-800 shadow-lg border border-emerald-200/50 hover:bg-white/90 hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
          >
            <Map className="w-4 h-4 mr-3" />
            <Download className="w-3 h-3 mr-1" />
            Maps & Export
          </Button>
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

        {/* Bottom Navigation */}
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
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center p-8 pb-4 bg-white/60 backdrop-blur-sm border-b border-white/50">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-medium text-gray-800">Maps & Export Indonesia</h1>
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
              🇮🇩 Indonesia Only
            </Badge>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
              📊 Data Export
            </Badge>
            <Button
              onClick={refreshData}
              size="sm"
              variant="outline"
              className="flex items-center gap-2 bg-transparent"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          <div className="flex items-center gap-6 text-gray-600">
            <div className="text-right">
              <div className="font-medium">{dateInfo.dayName}</div>
              <div className="text-sm">{dateInfo.fullDate}</div>
              <div className="text-xs text-blue-600">{dateInfo.time} WIB</div>
            </div>
            <div className="flex items-center gap-2 bg-emerald-100 px-4 py-2 rounded-xl shadow-md border border-emerald-200">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-emerald-800">Indonesia</span>
            </div>
            {weatherData && (
              <div className="flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-xl shadow-md border border-blue-200">
                <span className="text-sm font-medium text-blue-800">
                  {weatherData.temperature}°C, {weatherData.description}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area - Horizontal Layout */}
        <div className="flex-1 p-8 pt-4">
          {/* Map Area - Full Width */}
          <div className="mb-6">
            <Card className="h-[600px] bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-500" />
                    Peta Indonesia - {layers.find((l) => l.id === selectedLayer)?.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {clickedCoords && (
                      <Badge variant="outline" className="bg-white/90">
                        📍 {clickedCoords.lat.toFixed(4)}°, {clickedCoords.lng.toFixed(4)}°
                      </Badge>
                    )}
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {layers.find((l) => l.id === selectedLayer)?.source}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 h-full">
                <div className="h-full min-h-[500px]">
                  <LeafletMap selectedLayer={selectedLayer} fireData={fireData} onMapClick={handleMapClick} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Control Panels - Horizontal Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Layer Selection */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-500" />
                  Layer Peta Indonesia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {layers.map((layer) => (
                  <div
                    key={layer.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedLayer === layer.id
                        ? "bg-blue-50 border-blue-200 shadow-md"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                    onClick={() => setSelectedLayer(layer.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1 rounded ${layer.color} text-white`}>{layer.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 text-sm">{layer.name}</div>
                        <div className="text-xs text-gray-500">{layer.description}</div>
                        <div className="text-xs text-blue-600 mt-1">{layer.source}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Controls and Export */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-purple-500" />
                  Export Data Indonesia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="date-select">Pilih Tanggal</Label>
                  <Input
                    id="date-select"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label htmlFor="export-format">Format Ekspor</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih format" />
                    </SelectTrigger>
                    <SelectContent>
                      {exportFormats.map((format) => (
                        <SelectItem key={format.id} value={format.id}>
                          <div className="flex justify-between items-center w-full">
                            <span>{format.name}</span>
                            <span className="text-xs text-gray-500 ml-2">{format.extension}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isExporting && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Mengekspor...</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <Progress value={exportProgress} className="w-full" />
                  </div>
                )}

                <Button onClick={handleExport} disabled={!exportFormat || isExporting} className="w-full">
                  {isExporting ? "Mengekspor..." : "Ekspor Data Indonesia"}
                </Button>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-800 font-medium mb-1">📊 Export Features:</div>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>• Data tutupan lahan Indonesia</div>
                    <div>• Koordinat titik api aktif</div>
                    <div>• Statistik vegetasi NDVI</div>
                    <div>• Metadata temporal</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Panel - Indonesia Focus */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Satellite className="w-5 h-5 text-indigo-500" />
                  Statistik Indonesia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Fire Statistics - Indonesia Only */}
                {selectedLayer === "fires" && (
                  <div className="space-y-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="font-medium text-red-800">Titik Api Indonesia</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Hotspot</span>
                      <span className="font-semibold text-red-600">{fireData.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg Confidence</span>
                      <span className="font-semibold">
                        {fireData.length > 0
                          ? Math.round(fireData.reduce((sum, fire) => sum + fire.confidence, 0) / fireData.length)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 p-2 bg-red-100 rounded">
                      🔥 Hotspot terbanyak: Sumatra & Kalimantan
                    </div>
                    <div className="text-xs text-gray-500 mt-2 p-2 bg-orange-50 rounded">
                      📊 Data khusus wilayah Indonesia
                    </div>
                  </div>
                )}

                {/* Land Cover Statistics - Indonesia Only */}
                {selectedLayer === "landcover" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <TreePine className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-green-800">Tutupan Lahan Indonesia</span>
                    </div>
                    {isLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">Memuat data...</p>
                      </div>
                    ) : (
                      landCoverData.slice(0, 4).map((item, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                              <span className="text-sm font-medium">{item.type}</span>
                            </div>
                            <span className="text-xs text-gray-500">{item.percentage}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* General Indonesia Info */}
                <div className="space-y-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Luas Indonesia</span>
                    <span className="font-semibold">1,904,569 km²</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Jumlah Pulau</span>
                    <span className="font-semibold">17,508 pulau</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Provinsi</span>
                    <span className="font-semibold text-xs">38 Provinsi</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Populasi</span>
                    <span className="font-semibold text-xs">273+ Juta</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 p-2 bg-blue-50 rounded">
                    🗺️ Peta fokus Indonesia dengan data lengkap
                  </div>
                  <div className="text-xs text-gray-500 mt-2 p-2 bg-green-50 rounded">
                    🇮🇩 Ekspor data khusus Indonesia tersedia
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AskLandAI Component */}
      <AskLandAI />
    </div>
  )
}
