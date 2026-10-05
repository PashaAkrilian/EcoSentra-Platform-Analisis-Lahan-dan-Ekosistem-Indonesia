"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  Droplets,
  Wind,
  Shield,
  Heart,
  DollarSign,
  TrendingUp,
  Globe,
  Fish,
  Flower,
} from "lucide-react"
import Link from "next/link"
import { AskLandAI } from "@/components/ask-land-ai"

interface EcoService {
  id: string
  name: string
  category: "carbon" | "water" | "biodiversity" | "soil" | "air" | "pollination"
  description: string
  value: number
  unit: string
  trend: "up" | "down" | "stable"
  trendValue: number
  healthScore: number
  location: string
  area: number
  lastAssessment: string
  benefits: string[]
  threats: string[]
}

export default function EcoServices() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [ecoServices, setEcoServices] = useState<EcoService[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Load eco services data
  useEffect(() => {
    loadEcoServicesData()
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

  const loadEcoServicesData = async () => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockData: EcoService[] = [
        {
          id: "1",
          name: "Carbon Sequestration",
          category: "carbon",
          description: "Forest and soil carbon storage capacity across managed landscapes",
          value: 2450,
          unit: "tons CO2/year",
          trend: "up",
          trendValue: 12.5,
          healthScore: 85,
          location: "Kalimantan Forest Reserve",
          area: 15000,
          lastAssessment: "2025-01-15",
          benefits: ["Climate regulation", "Carbon credits revenue", "Air quality improvement"],
          threats: ["Deforestation", "Forest fires", "Land conversion"],
        },
        {
          id: "2",
          name: "Water Regulation",
          category: "water",
          description: "Watershed protection and water flow regulation services",
          value: 890,
          unit: "million liters/year",
          trend: "down",
          trendValue: -8.2,
          healthScore: 72,
          location: "Java Watershed",
          area: 8500,
          lastAssessment: "2025-01-20",
          benefits: ["Flood control", "Water supply", "Erosion prevention"],
          threats: ["Urban development", "Agricultural expansion", "Climate change"],
        },
        {
          id: "3",
          name: "Biodiversity Conservation",
          category: "biodiversity",
          description: "Habitat provision and species conservation value",
          value: 156,
          unit: "species count",
          trend: "stable",
          trendValue: 2.1,
          healthScore: 91,
          location: "Sumatra National Park",
          area: 12000,
          lastAssessment: "2025-01-10",
          benefits: ["Genetic resources", "Ecotourism", "Research value"],
          threats: ["Habitat fragmentation", "Poaching", "Invasive species"],
        },
        {
          id: "4",
          name: "Soil Health",
          category: "soil",
          description: "Soil fertility and erosion control services",
          value: 78,
          unit: "soil quality index",
          trend: "up",
          trendValue: 5.8,
          healthScore: 68,
          location: "Agricultural Areas",
          area: 25000,
          lastAssessment: "2025-01-25",
          benefits: ["Crop productivity", "Nutrient cycling", "Water retention"],
          threats: ["Intensive farming", "Chemical inputs", "Erosion"],
        },
        {
          id: "5",
          name: "Air Purification",
          category: "air",
          description: "Air quality improvement through pollutant removal",
          value: 340,
          unit: "tons pollutants/year",
          trend: "up",
          trendValue: 15.3,
          healthScore: 82,
          location: "Urban Green Spaces",
          area: 3200,
          lastAssessment: "2025-01-22",
          benefits: ["Health improvement", "Reduced healthcare costs", "Quality of life"],
          threats: ["Urban pollution", "Development pressure", "Climate stress"],
        },
        {
          id: "6",
          name: "Pollination Services",
          category: "pollination",
          description: "Natural pollination support for agricultural crops",
          value: 1250,
          unit: "USD thousands/year",
          trend: "down",
          trendValue: -12.7,
          healthScore: 58,
          location: "Agricultural Regions",
          area: 18000,
          lastAssessment: "2025-01-18",
          benefits: ["Crop yields", "Food security", "Agricultural income"],
          threats: ["Pesticide use", "Habitat loss", "Climate change"],
        },
      ]

      setEcoServices(mockData)
    } catch (error) {
      console.error("Error loading eco services data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "carbon":
        return <TreePine className="w-5 h-5 text-green-600" />
      case "water":
        return <Droplets className="w-5 h-5 text-blue-600" />
      case "biodiversity":
        return <Fish className="w-5 h-5 text-purple-600" />
      case "soil":
        return <Globe className="w-5 h-5 text-orange-600" />
      case "air":
        return <Wind className="w-5 h-5 text-cyan-600" />
      case "pollination":
        return <Flower className="w-5 h-5 text-pink-600" />
      default:
        return <Leaf className="w-5 h-5 text-green-600" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "carbon":
        return "bg-green-100 text-green-800 border-green-200"
      case "water":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "biodiversity":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "soil":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "air":
        return "bg-cyan-100 text-cyan-800 border-cyan-200"
      case "pollination":
        return "bg-pink-100 text-pink-800 border-pink-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case "down":
        return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-green-600"
      case "down":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const filteredServices =
    selectedCategory === "all" ? ecoServices : ecoServices.filter((service) => service.category === selectedCategory)

  const categories = [
    { id: "all", name: "All Services", icon: <Leaf className="w-4 h-4" /> },
    { id: "carbon", name: "Carbon", icon: <TreePine className="w-4 h-4" /> },
    { id: "water", name: "Water", icon: <Droplets className="w-4 h-4" /> },
    { id: "biodiversity", name: "Biodiversity", icon: <Fish className="w-4 h-4" /> },
    { id: "soil", name: "Soil", icon: <Globe className="w-4 h-4" /> },
    { id: "air", name: "Air", icon: <Wind className="w-4 h-4" /> },
    { id: "pollination", name: "Pollination", icon: <Flower className="w-4 h-4" /> },
  ]

  const getOverallStats = () => {
    const totalValue = ecoServices.reduce((sum, service) => {
      // Convert all values to a common monetary equivalent for demonstration
      let monetaryValue = service.value
      if (service.category === "carbon") monetaryValue *= 50 // $50 per ton CO2
      if (service.category === "water") monetaryValue *= 0.001 // $0.001 per liter
      if (service.category === "biodiversity") monetaryValue *= 10000 // $10k per species
      if (service.category === "air") monetaryValue *= 100 // $100 per ton pollutant
      return sum + monetaryValue
    }, 0)

    const avgHealthScore = ecoServices.reduce((sum, service) => sum + service.healthScore, 0) / ecoServices.length
    const totalArea = ecoServices.reduce((sum, service) => sum + service.area, 0)
    const servicesAtRisk = ecoServices.filter((service) => service.healthScore < 70).length

    return { totalValue, avgHealthScore, totalArea, servicesAtRisk }
  }

  const stats = getOverallStats()

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
          <Link href="/disaster-alerts">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/40 hover:shadow-md transition-all duration-300 hover:translate-x-1"
            >
              <AlertTriangle className="w-4 h-4 mr-3" />
              Disaster Alerts
            </Button>
          </Link>
          <Button
            variant="secondary"
            className="w-full justify-start bg-white/80 text-emerald-800 shadow-lg border border-emerald-200/50 hover:bg-white/90 hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
          >
            <TreePine className="w-4 h-4 mr-3" />
            Eco Services
          </Button>
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
            <h1 className="text-3xl font-bold text-gray-800">Ecosystem Services</h1>
            <p className="text-gray-600 mt-1">Monitor and value nature's contributions to human well-being</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-gray-600">
              <div className="font-medium">{dateInfo.dayName}</div>
              <div className="text-sm">{dateInfo.fullDate}</div>
              <div className="text-xs text-blue-600">{dateInfo.time}</div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Economic Value</p>
                  <p className="text-3xl font-bold text-green-600">${(stats.totalValue / 1000).toFixed(0)}K</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Health Score</p>
                  <p className={`text-3xl font-bold ${getHealthScoreColor(stats.avgHealthScore)}`}>
                    {Math.round(stats.avgHealthScore)}%
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Heart className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Area</p>
                  <p className="text-3xl font-bold text-blue-600">{(stats.totalArea / 1000).toFixed(0)}K ha</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Globe className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Services at Risk</p>
                  <p className="text-3xl font-bold text-red-600">{stats.servicesAtRisk}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
          <CardHeader>
            <CardTitle>Service Categories</CardTitle>
            <CardDescription>Filter ecosystem services by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-2"
                >
                  {category.icon}
                  {category.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Services Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading ecosystem services...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredServices.map((service) => (
              <Card
                key={service.id}
                className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(service.category)}
                      <div>
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                        <Badge className={getCategoryColor(service.category)}>{service.category}</Badge>
                      </div>
                    </div>
                    <div className={`text-right ${getHealthScoreColor(service.healthScore)}`}>
                      <div className="text-2xl font-bold">{service.healthScore}%</div>
                      <div className="text-xs">Health Score</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{service.description}</p>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-500">Service Value</div>
                      <div className="font-semibold text-lg">
                        {service.value.toLocaleString()} {service.unit}
                      </div>
                      <div className={`flex items-center gap-1 text-sm ${getTrendColor(service.trend)}`}>
                        {getTrendIcon(service.trend)}
                        {service.trendValue > 0 ? "+" : ""}
                        {service.trendValue}% this year
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-500">Coverage Area</div>
                      <div className="font-semibold text-lg">{service.area.toLocaleString()} ha</div>
                      <div className="text-sm text-gray-600">{service.location}</div>
                    </div>
                  </div>

                  {/* Health Score Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Ecosystem Health</span>
                      <span className={getHealthScoreColor(service.healthScore)}>{service.healthScore}%</span>
                    </div>
                    <Progress value={service.healthScore} className="h-2" />
                  </div>

                  {/* Benefits and Threats */}
                  <Tabs defaultValue="benefits" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="benefits">Benefits</TabsTrigger>
                      <TabsTrigger value="threats">Threats</TabsTrigger>
                    </TabsList>
                    <TabsContent value="benefits" className="mt-3">
                      <div className="space-y-2">
                        {service.benefits.map((benefit, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="threats" className="mt-3">
                      <div className="space-y-2">
                        {service.threats.map((threat, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span>{threat}</span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="text-xs text-gray-500 mt-4 pt-3 border-t">
                    Last assessed: {new Date(service.lastAssessment).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* AskLandAI Component */}
      <AskLandAI />
    </div>
  )
}
