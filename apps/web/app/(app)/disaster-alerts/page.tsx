"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Bell,
  Filter,
  Search,
  Clock,
  Zap,
  Droplets,
  Sun,
  Wind,
  Activity,
  Eye,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { AskLandAI } from "@/components/ask-land-ai"

interface DisasterAlert {
  id: string
  type: "fire" | "drought" | "flood" | "earthquake" | "storm" | "pest" | "disease"
  severity: "low" | "medium" | "high" | "critical"
  title: string
  description: string
  location: string
  coordinates: { lat: number; lng: number }
  affectedArea: number
  timestamp: string
  status: "active" | "monitoring" | "resolved"
  source: string
  estimatedImpact: string
}

export default function DisasterAlerts() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [alerts, setAlerts] = useState<DisasterAlert[]>([])
  const [filteredAlerts, setFilteredAlerts] = useState<DisasterAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Load alerts data
  useEffect(() => {
    loadAlertsData()
  }, [])

  // Filter alerts based on search and filters
  useEffect(() => {
    let filtered = alerts

    if (searchTerm) {
      filtered = filtered.filter(
        (alert) =>
          alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          alert.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          alert.description.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (severityFilter !== "all") {
      filtered = filtered.filter((alert) => alert.severity === severityFilter)
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((alert) => alert.type === typeFilter)
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((alert) => alert.status === statusFilter)
    }

    setFilteredAlerts(filtered)
  }, [alerts, searchTerm, severityFilter, typeFilter, statusFilter])

  const formatDate = (date: Date) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]

    return {
      dayName: days[date.getDay()],
      fullDate: `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`,
      time: date.toLocaleTimeString("en-US", { hour12: false }),
    }
  }

  const dateInfo = formatDate(currentTime)

  const loadAlertsData = async () => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockAlerts: DisasterAlert[] = [
        {
          id: "1",
          type: "fire",
          severity: "critical",
          title: "Large Forest Fire in Central Kalimantan",
          description:
            "Massive forest fire spreading rapidly across 15,000 hectares of protected forest area. Strong winds are accelerating the spread.",
          location: "Kalimantan Tengah",
          coordinates: { lat: -2.2115, lng: 113.9213 },
          affectedArea: 15000,
          timestamp: "2025-01-29T14:30:00Z",
          status: "active",
          source: "NASA FIRMS",
          estimatedImpact: "High - Threatens wildlife habitat and nearby communities",
        },
        {
          id: "2",
          type: "drought",
          severity: "high",
          title: "Severe Drought Conditions in East Java",
          description:
            "Extended dry period with rainfall 60% below normal. Agricultural areas severely affected with crop failures reported.",
          location: "Jawa Timur",
          coordinates: { lat: -7.536, lng: 112.2384 },
          affectedArea: 8500,
          timestamp: "2025-01-29T08:15:00Z",
          status: "monitoring",
          source: "BMKG",
          estimatedImpact: "High - Agricultural losses, water shortage",
        },
        {
          id: "3",
          type: "flood",
          severity: "medium",
          title: "Flash Flood Warning in North Sumatra",
          description:
            "Heavy rainfall expected to continue for 48 hours. River levels rising rapidly in multiple locations.",
          location: "Sumatera Utara",
          coordinates: { lat: 3.5952, lng: 98.6722 },
          affectedArea: 2300,
          timestamp: "2025-01-29T06:45:00Z",
          status: "active",
          source: "BMKG",
          estimatedImpact: "Medium - Potential property damage and displacement",
        },
        {
          id: "4",
          type: "pest",
          severity: "medium",
          title: "Brown Planthopper Outbreak in Rice Fields",
          description:
            "Significant increase in brown planthopper population detected across multiple rice growing areas.",
          location: "Jawa Barat",
          coordinates: { lat: -6.9175, lng: 107.6191 },
          affectedArea: 1200,
          timestamp: "2025-01-28T16:20:00Z",
          status: "monitoring",
          source: "Ministry of Agriculture",
          estimatedImpact: "Medium - Rice crop yield reduction expected",
        },
        {
          id: "5",
          type: "storm",
          severity: "high",
          title: "Tropical Cyclone Approaching Sulawesi",
          description:
            "Category 2 tropical cyclone with winds up to 150 km/h expected to make landfall within 24 hours.",
          location: "Sulawesi Selatan",
          coordinates: { lat: -5.1477, lng: 119.4327 },
          affectedArea: 5600,
          timestamp: "2025-01-29T12:00:00Z",
          status: "active",
          source: "BMKG",
          estimatedImpact: "High - Structural damage, power outages expected",
        },
        {
          id: "6",
          type: "earthquake",
          severity: "low",
          title: "Minor Earthquake Activity in Papua",
          description:
            "Series of minor earthquakes (magnitude 3.2-4.1) detected. No immediate threat but monitoring continues.",
          location: "Papua",
          coordinates: { lat: -4.2699, lng: 138.0804 },
          affectedArea: 500,
          timestamp: "2025-01-29T03:30:00Z",
          status: "monitoring",
          source: "BMKG",
          estimatedImpact: "Low - No significant damage expected",
        },
        {
          id: "7",
          type: "disease",
          severity: "medium",
          title: "Bacterial Leaf Blight in Rice Crops",
          description:
            "Bacterial leaf blight disease spreading in rice fields due to high humidity and temperature conditions.",
          location: "Jawa Tengah",
          coordinates: { lat: -7.15, lng: 110.1403 },
          affectedArea: 890,
          timestamp: "2025-01-28T11:15:00Z",
          status: "active",
          source: "Agricultural Extension Service",
          estimatedImpact: "Medium - Crop quality and yield reduction",
        },
      ]

      setAlerts(mockAlerts)
    } catch (error) {
      console.error("Error loading alerts data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "text-blue-600 bg-blue-100 border-blue-200"
      case "medium":
        return "text-yellow-600 bg-yellow-100 border-yellow-200"
      case "high":
        return "text-orange-600 bg-orange-100 border-orange-200"
      case "critical":
        return "text-red-600 bg-red-100 border-red-200"
      default:
        return "text-gray-600 bg-gray-100 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-red-600 bg-red-100"
      case "monitoring":
        return "text-yellow-600 bg-yellow-100"
      case "resolved":
        return "text-green-600 bg-green-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "fire":
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case "drought":
        return <Sun className="w-5 h-5 text-orange-500" />
      case "flood":
        return <Droplets className="w-5 h-5 text-blue-500" />
      case "earthquake":
        return <Activity className="w-5 h-5 text-purple-500" />
      case "earthquake":
        return <Activity className="w-5 h-5 text-purple-500" />
      case "storm":
        return <Wind className="w-5 h-5 text-gray-500" />
      case "pest":
        return <Activity className="w-5 h-5 text-green-500" />
      case "disease":
        return <Zap className="w-5 h-5 text-pink-500" />
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />
    }
  }

  const getAlertStats = () => {
    const total = alerts.length
    const active = alerts.filter((a) => a.status === "active").length
    const critical = alerts.filter((a) => a.severity === "critical").length
    const high = alerts.filter((a) => a.severity === "high").length

    return { total, active, critical, high }
  }

  const stats = getAlertStats()

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
          <Link href="/maps">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/40 hover:shadow-md transition-all duration-300 hover:translate-x-1"
            >
              <Map className="w-4 h-4 mr-3" />
              Maps & Export
            </Button>
          </Link>
          <Button
            variant="secondary"
            className="w-full justify-start bg-white/80 text-emerald-800 shadow-lg border border-emerald-200/50 hover:bg-white/90 hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
          >
            <AlertTriangle className="w-4 h-4 mr-3" />
            Disaster Alerts
          </Button>
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
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Disaster Alerts</h1>
            <p className="text-gray-600 mt-1">Monitor and respond to environmental threats and disasters</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-gray-600">
              <div className="font-medium">{dateInfo.dayName}</div>
              <div className="text-sm">{dateInfo.fullDate}</div>
              <div className="text-xs text-blue-600">{dateInfo.time}</div>
            </div>
            <Button
              onClick={loadAlertsData}
              variant="outline"
              className="flex items-center gap-2 bg-transparent"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Alerts</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                  <p className="text-3xl font-bold text-red-600">{stats.active}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Critical</p>
                  <p className="text-3xl font-bold text-red-700">{stats.critical}</p>
                </div>
                <div className="p-3 bg-red-200 rounded-full">
                  <Zap className="w-6 h-6 text-red-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Priority</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.high}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Activity className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-500" />
              Filter Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="fire">Fire</SelectItem>
                  <SelectItem value="drought">Drought</SelectItem>
                  <SelectItem value="flood">Flood</SelectItem>
                  <SelectItem value="earthquake">Earthquake</SelectItem>
                  <SelectItem value="storm">Storm</SelectItem>
                  <SelectItem value="pest">Pest</SelectItem>
                  <SelectItem value="disease">Disease</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="monitoring">Monitoring</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading disaster alerts...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredAlerts.map((alert) => (
              <Card
                key={alert.id}
                className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">{getTypeIcon(alert.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">{alert.title}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                            <Badge className={getStatusColor(alert.status)}>{alert.status}</Badge>
                            <Badge variant="outline" className="capitalize">
                              {alert.type}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div className="flex items-center gap-1 mb-1">
                            <Clock className="w-4 h-4" />
                            {new Date(alert.timestamp).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {alert.location}
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-600 mb-4">{alert.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-500">Affected Area</div>
                          <div className="font-semibold">{alert.affectedArea.toLocaleString()} hectares</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-500">Data Source</div>
                          <div className="font-semibold">{alert.source}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-500">Coordinates</div>
                          <div className="font-semibold">
                            {alert.coordinates.lat.toFixed(4)}, {alert.coordinates.lng.toFixed(4)}
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
                        <div className="text-sm text-yellow-800">
                          <strong>Estimated Impact:</strong> {alert.estimatedImpact}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                        <Button size="sm" variant="outline">
                          <MapPin className="w-4 h-4 mr-1" />
                          View on Map
                        </Button>
                        {alert.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-orange-600 hover:text-orange-700 bg-transparent"
                          >
                            <Bell className="w-4 h-4 mr-1" />
                            Subscribe to Updates
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredAlerts.length === 0 && (
              <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Alerts Found</h3>
                  <p className="text-gray-500">
                    {searchTerm || severityFilter !== "all" || typeFilter !== "all" || statusFilter !== "all"
                      ? "No alerts match your current filters. Try adjusting your search criteria."
                      : "No disaster alerts are currently active. This is good news!"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* AskLandAI Component */}
      <AskLandAI />
    </div>
  )
}
