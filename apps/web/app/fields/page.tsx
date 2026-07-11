"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Activity,
  Droplets,
  Thermometer,
  TrendingUp,
  TrendingDown,
  X,
} from "lucide-react"
import Link from "next/link"
import { AskLandAI } from "@/components/ask-land-ai"

interface FieldData {
  id: string
  name: string
  area: number
  cropType: string
  plantingDate: string
  healthScore: number
  ndviValue: number
  soilMoisture: number
  temperature: number
  lastUpdate: string
  status: "healthy" | "warning" | "critical"
  coordinates: { lat: number; lng: number }
}

export default function Fields() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [fieldsData, setFieldsData] = useState<FieldData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newField, setNewField] = useState({
    name: "",
    area: "",
    cropType: "",
    plantingDate: "",
    coordinates: { lat: "", lng: "" },
  })

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Load fields data
  useEffect(() => {
    loadFieldsData()
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

  const loadFieldsData = async () => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockData: FieldData[] = [
        {
          id: "1",
          name: "Rice Field Alpha",
          area: 2.5,
          cropType: "Rice",
          plantingDate: "2024-12-15",
          healthScore: 85,
          ndviValue: 0.72,
          soilMoisture: 68,
          temperature: 28.5,
          lastUpdate: "2 hours ago",
          status: "healthy",
          coordinates: { lat: -6.2088, lng: 106.8456 },
        },
        {
          id: "2",
          name: "Corn Field Beta",
          area: 1.8,
          cropType: "Corn",
          plantingDate: "2024-11-20",
          healthScore: 72,
          ndviValue: 0.58,
          soilMoisture: 45,
          temperature: 31.2,
          lastUpdate: "4 hours ago",
          status: "warning",
          coordinates: { lat: -7.2575, lng: 112.7521 },
        },
        {
          id: "3",
          name: "Soybean Field Gamma",
          area: 3.2,
          cropType: "Soybean",
          plantingDate: "2025-01-10",
          healthScore: 91,
          ndviValue: 0.81,
          soilMoisture: 72,
          temperature: 27.8,
          lastUpdate: "1 hour ago",
          status: "healthy",
          coordinates: { lat: -2.9761, lng: 104.7754 },
        },
        {
          id: "4",
          name: "Wheat Field Delta",
          area: 2.1,
          cropType: "Wheat",
          plantingDate: "2024-10-05",
          healthScore: 45,
          ndviValue: 0.32,
          soilMoisture: 28,
          temperature: 33.1,
          lastUpdate: "6 hours ago",
          status: "critical",
          coordinates: { lat: 3.5952, lng: 98.6722 },
        },
        {
          id: "5",
          name: "Vegetable Field Epsilon",
          area: 1.2,
          cropType: "Mixed Vegetables",
          plantingDate: "2025-01-05",
          healthScore: 78,
          ndviValue: 0.65,
          soilMoisture: 58,
          temperature: 29.3,
          lastUpdate: "3 hours ago",
          status: "healthy",
          coordinates: { lat: -6.9175, lng: 107.6191 },
        },
      ]

      setFieldsData(mockData)
    } catch (error) {
      console.error("Error loading fields data:", error)
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

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const handleAddField = () => {
    if (!newField.name || !newField.area || !newField.cropType) return

    const field: FieldData = {
      id: Date.now().toString(),
      name: newField.name,
      area: Number.parseFloat(newField.area),
      cropType: newField.cropType,
      plantingDate: newField.plantingDate,
      healthScore: Math.floor(Math.random() * 40) + 60, // Random score between 60-100
      ndviValue: Math.random() * 0.5 + 0.3, // Random NDVI between 0.3-0.8
      soilMoisture: Math.floor(Math.random() * 40) + 40, // Random moisture 40-80%
      temperature: Math.random() * 8 + 25, // Random temp 25-33°C
      lastUpdate: "Just now",
      status: "healthy",
      coordinates: {
        lat: Number.parseFloat(newField.coordinates.lat) || -2.5489,
        lng: Number.parseFloat(newField.coordinates.lng) || 118.0149,
      },
    }

    setFieldsData((prev) => [...prev, field])
    setNewField({
      name: "",
      area: "",
      cropType: "",
      plantingDate: "",
      coordinates: { lat: "", lng: "" },
    })
    setShowAddForm(false)
  }

  const handleDeleteField = (id: string) => {
    setFieldsData((prev) => prev.filter((field) => field.id !== id))
  }

  const selectedFieldData = selectedField ? fieldsData.find((f) => f.id === selectedField) : null

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
          <Button
            variant="secondary"
            className="w-full justify-start bg-white/80 text-emerald-800 shadow-lg border border-emerald-200/50 hover:bg-white/90 hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
          >
            <MapPin className="w-4 h-4 mr-3" />
            My Fields
          </Button>
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
            <h1 className="text-3xl font-bold text-gray-800">My Fields</h1>
            <p className="text-gray-600 mt-1">Manage and monitor your agricultural fields</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-gray-600">
              <div className="font-medium">{dateInfo.dayName}</div>
              <div className="text-sm">{dateInfo.fullDate}</div>
              <div className="text-xs text-blue-600">{dateInfo.time}</div>
            </div>
            <Button onClick={() => setShowAddForm(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>
          </div>
        </div>

        {/* Add Field Form */}
        {showAddForm && (
          <Card className="mb-8 bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
            <CardHeader>
              <CardTitle>Add New Field</CardTitle>
              <CardDescription>Enter the details for your new agricultural field</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="field-name">Field Name</Label>
                  <Input
                    id="field-name"
                    value={newField.name}
                    onChange={(e) => setNewField((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Rice Field Alpha"
                  />
                </div>
                <div>
                  <Label htmlFor="field-area">Area (hectares)</Label>
                  <Input
                    id="field-area"
                    type="number"
                    value={newField.area}
                    onChange={(e) => setNewField((prev) => ({ ...prev, area: e.target.value }))}
                    placeholder="e.g., 2.5"
                  />
                </div>
                <div>
                  <Label htmlFor="crop-type">Crop Type</Label>
                  <Select
                    value={newField.cropType}
                    onValueChange={(value) => setNewField((prev) => ({ ...prev, cropType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select crop type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rice">Rice</SelectItem>
                      <SelectItem value="Corn">Corn</SelectItem>
                      <SelectItem value="Soybean">Soybean</SelectItem>
                      <SelectItem value="Wheat">Wheat</SelectItem>
                      <SelectItem value="Mixed Vegetables">Mixed Vegetables</SelectItem>
                      <SelectItem value="Palm Oil">Palm Oil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="planting-date">Planting Date</Label>
                  <Input
                    id="planting-date"
                    type="date"
                    value={newField.plantingDate}
                    onChange={(e) => setNewField((prev) => ({ ...prev, plantingDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={newField.coordinates.lat}
                    onChange={(e) =>
                      setNewField((prev) => ({ ...prev, coordinates: { ...prev.coordinates, lat: e.target.value } }))
                    }
                    placeholder="e.g., -6.2088"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={newField.coordinates.lng}
                    onChange={(e) =>
                      setNewField((prev) => ({ ...prev, coordinates: { ...prev.coordinates, lng: e.target.value } }))
                    }
                    placeholder="e.g., 106.8456"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAddField} className="bg-emerald-500 hover:bg-emerald-600">
                  Add Field
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fields Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading your fields...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fieldsData.map((field) => (
              <Card
                key={field.id}
                className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedField(field.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{field.name}</CardTitle>
                    <Badge className={getStatusColor(field.status)}>{field.status}</Badge>
                  </div>
                  <CardDescription>
                    {field.cropType} • {field.area} ha
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Health Score */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Health Score</span>
                        <span className={`font-medium ${getHealthScoreColor(field.healthScore)}`}>
                          {field.healthScore}%
                        </span>
                      </div>
                      <Progress value={field.healthScore} className="h-2" />
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <TreePine className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="text-xs text-gray-500">NDVI</div>
                          <div className="font-medium">{field.ndviValue.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="text-xs text-gray-500">Moisture</div>
                          <div className="font-medium">{field.soilMoisture}%</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-red-500" />
                        <div>
                          <div className="text-xs text-gray-500">Temp</div>
                          <div className="font-medium">{field.temperature.toFixed(1)}°C</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-500" />
                        <div>
                          <div className="text-xs text-gray-500">Planted</div>
                          <div className="font-medium">{new Date(field.plantingDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteField(field.id)
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="text-xs text-gray-500 pt-2 border-t">Updated {field.lastUpdate}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Field Details Modal/Panel */}
        {selectedFieldData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{selectedFieldData.name}</CardTitle>
                    <CardDescription>
                      {selectedFieldData.cropType} • {selectedFieldData.area} hectares
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedField(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-green-500" />
                            <div>
                              <div className="text-sm text-gray-500">Health Score</div>
                              <div
                                className={`text-2xl font-bold ${getHealthScoreColor(selectedFieldData.healthScore)}`}
                              >
                                {selectedFieldData.healthScore}%
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <TreePine className="w-5 h-5 text-emerald-500" />
                            <div>
                              <div className="text-sm text-gray-500">NDVI Value</div>
                              <div className="text-2xl font-bold text-emerald-600">
                                {selectedFieldData.ndviValue.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Droplets className="w-5 h-5 text-blue-500" />
                            <div>
                              <div className="text-sm text-gray-500">Soil Moisture</div>
                              <div className="text-2xl font-bold text-blue-600">{selectedFieldData.soilMoisture}%</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Thermometer className="w-5 h-5 text-red-500" />
                            <div>
                              <div className="text-sm text-gray-500">Temperature</div>
                              <div className="text-2xl font-bold text-red-600">
                                {selectedFieldData.temperature.toFixed(1)}°C
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Field Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Area:</span>
                            <span className="font-medium">{selectedFieldData.area} hectares</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Crop Type:</span>
                            <span className="font-medium">{selectedFieldData.cropType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Planting Date:</span>
                            <span className="font-medium">
                              {new Date(selectedFieldData.plantingDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <Badge className={getStatusColor(selectedFieldData.status)}>
                              {selectedFieldData.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Coordinates:</span>
                            <span className="font-medium">
                              {selectedFieldData.coordinates.lat.toFixed(4)},{" "}
                              {selectedFieldData.coordinates.lng.toFixed(4)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Recent Trends</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Health Score</span>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-green-500" />
                              <span className="text-green-600">+5% this week</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">NDVI Value</span>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-green-500" />
                              <span className="text-green-600">+0.08 this month</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Soil Moisture</span>
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-red-500" />
                              <span className="text-red-600">-12% this week</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Temperature</span>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-orange-500" />
                              <span className="text-orange-600">+2.3°C this month</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="analytics" className="space-y-6">
                    <div className="text-center py-12">
                      <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">Analytics Dashboard</h3>
                      <p className="text-gray-500">
                        Detailed analytics and charts for {selectedFieldData.name} will be displayed here.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-6">
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">Historical Data</h3>
                      <p className="text-gray-500">
                        Historical trends and data for {selectedFieldData.name} will be displayed here.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* AskLandAI Component */}
      <AskLandAI />
    </div>
  )
}
