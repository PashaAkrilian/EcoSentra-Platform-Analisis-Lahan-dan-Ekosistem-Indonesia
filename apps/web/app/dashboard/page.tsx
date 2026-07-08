"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
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
  TrendingUp,
  TrendingDown,
  Activity,
  Droplets,
  Thermometer,
  Wind,
  Sun,
  Cloud,
  Eye,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { AskLandAI } from "@/components/ask-land-ai"

interface WeatherData {
  temperature: number
  humidity: number
  windSpeed: number
  description: string
  uvIndex: number
}

interface FieldData {
  id: string
  name: string
  area: number
  cropType: string
  healthScore: number
  lastUpdate: string
  status: "healthy" | "warning" | "critical"
}

interface AlertData {
  id: string
  type: "fire" | "drought" | "flood" | "pest"
  severity: "low" | "medium" | "high"
  location: string
  description: string
  timestamp: string
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [fieldsData, setFieldsData] = useState<FieldData[]>([])
  const [alertsData, setAlertsData] = useState<AlertData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
  }, [])

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

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Simulate API calls
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Mock weather data
      setWeatherData({
        temperature: 28.5,
        humidity: 75,
        windSpeed: 12,
        description: "Partly cloudy",
        uvIndex: 7,
      })

      // Mock fields data
      setFieldsData([
        {
          id: "1",
          name: "Rice Field A",
          area: 2.5,
          cropType: "Rice",
          healthScore: 85,
          lastUpdate: "2 hours ago",
          status: "healthy",
        },
        {
          id: "2",
          name: "Corn Field B",
          area: 1.8,
          cropType: "Corn",
          healthScore: 72,
          lastUpdate: "4 hours ago",
          status: "warning",
        },
        {
          id: "3",
          name: "Soybean Field C",
          area: 3.2,
          cropType: "Soybean",
          healthScore: 91,
          lastUpdate: "1 hour ago",
          status: "healthy",
        },
        {
          id: "4",
          name: "Wheat Field D",
          area: 2.1,
          cropType: "Wheat",
          healthScore: 45,
          lastUpdate: "6 hours ago",
          status: "critical",
        },
      ])

      // Mock alerts data
      setAlertsData([
        {
          id: "1",
          type: "fire",
          severity: "high",
          location: "Kalimantan Tengah",
          description: "Forest fire detected near agricultural area",
          timestamp: "2 hours ago",
        },
        {
          id: "2",
          type: "drought",
          severity: "medium",
          location: "Jawa Timur",
          description: "Low soil moisture levels detected",
          timestamp: "5 hours ago",
        },
        {
          id: "3",
          type: "pest",
          severity: "low",
          location: "Sumatera Utara",
          description: "Increased pest activity in rice fields",
          timestamp: "1 day ago",
        },
      ])
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-100"
      case "warning":
        return "text-yellow-600 bg-yellow-100"
      case "critical":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "text-blue-600 bg-blue-100"
      case "medium":
        return "text-yellow-600 bg-yellow-100"
      case "high":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "fire":
        return <AlertTriangle className="w-4 h-4" />
      case "drought":
        return <Sun className="w-4 h-4" />
      case "flood":
        return <Droplets className="w-4 h-4" />
      case "pest":
        return <Activity className="w-4 h-4" />
      default:
        return <AlertTriangle className="w-4 h-4" />
    }
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
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your agricultural operations and land management</p>
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

        {/* Weather Card */}
        {weatherData && (
          <Card className="mb-8 bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="w-5 h-5" />
                Current Weather
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <Thermometer className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{weatherData.temperature}°C</div>
                  <div className="text-sm opacity-80">Temperature</div>
                </div>
                <div className="text-center">
                  <Droplets className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{weatherData.humidity}%</div>
                  <div className="text-sm opacity-80">Humidity</div>
                </div>
                <div className="text-center">
                  <Wind className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{weatherData.windSpeed}</div>
                  <div className="text-sm opacity-80">km/h Wind</div>
                </div>
                <div className="text-center">
                  <Sun className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{weatherData.uvIndex}</div>
                  <div className="text-sm opacity-80">UV Index</div>
                </div>
                <div className="text-center">
                  <Eye className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-lg font-bold">{weatherData.description}</div>
                  <div className="text-sm opacity-80">Conditions</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Fields</p>
                  <p className="text-3xl font-bold text-gray-800">{fieldsData.length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-center mt-4 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600">+2 this month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Area</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {fieldsData.reduce((sum, field) => sum + field.area, 0).toFixed(1)} ha
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center mt-4 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600">+0.5 ha this month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Health Score</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {fieldsData.length > 0
                      ? Math.round(fieldsData.reduce((sum, field) => sum + field.healthScore, 0) / fieldsData.length)
                      : 0}
                    %
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-full">
                  <TreePine className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <div className="flex items-center mt-4 text-sm">
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                <span className="text-red-600">-3% this week</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                  <p className="text-3xl font-bold text-gray-800">{alertsData.length}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="flex items-center mt-4 text-sm">
                <Zap className="w-4 h-4 text-yellow-500 mr-1" />
                <span className="text-yellow-600">2 high priority</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fields and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Fields Overview */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-500" />
                Field Status
              </CardTitle>
              <CardDescription>Monitor the health and status of your agricultural fields</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading field data...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fieldsData.map((field) => (
                    <div
                      key={field.id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800">{field.name}</h3>
                        <Badge className={getStatusColor(field.status)}>{field.status}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div>Area: {field.area} ha</div>
                        <div>Crop: {field.cropType}</div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Health Score</span>
                          <span className="font-medium">{field.healthScore}%</span>
                        </div>
                        <Progress value={field.healthScore} className="h-2" />
                      </div>
                      <div className="text-xs text-gray-500 mt-2">Updated {field.lastUpdate}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Recent Alerts
              </CardTitle>
              <CardDescription>Stay informed about potential risks and issues</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading alerts...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alertsData.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-800 capitalize">{alert.type} Alert</h3>
                            <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{alert.location}</span>
                            <span>{alert.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AskLandAI Component */}
      <AskLandAI />
    </div>
  )
}
