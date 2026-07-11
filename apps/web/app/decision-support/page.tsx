"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
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
  TrendingUp,
  Target,
  Clock,
  Users,
  DollarSign,
  BarChart3,
  CheckCircle,
  XCircle,
  Calendar,
  FileText,
  Lightbulb,
  Activity,
  Sparkles,
  Zap,
  Star,
  Menu,
  Download,
} from "lucide-react"
import Link from "next/link"
import { AskLandAI } from "@/components/ask-land-ai"

interface Scenario {
  id: string
  title: string
  description: string
  category: "agriculture" | "forestry" | "disaster" | "conservation"
  status: "active" | "completed" | "pending"
  riskLevel: "low" | "medium" | "high"
  roi: number
  confidence: number
  createdAt: string
  deadline: string
  stakeholders: number
}

export default function DecisionSupport() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newScenario, setNewScenario] = useState({
    title: "",
    description: "",
    category: "",
    deadline: "",
  })

  // Load sample scenarios
  useEffect(() => {
    const sampleScenarios: Scenario[] = [
      {
        id: "1",
        title: "Optimasi Rotasi Tanaman Padi-Jagung",
        description: "Analisis sistem rotasi tanaman untuk meningkatkan produktivitas lahan pertanian di Jawa Tengah",
        category: "agriculture",
        status: "active",
        riskLevel: "low",
        roi: 85,
        confidence: 92,
        createdAt: "2025-01-25",
        deadline: "2025-02-15",
        stakeholders: 12,
      },
      {
        id: "2",
        title: "Restorasi Hutan Mangrove Pesisir",
        description: "Program rehabilitasi ekosistem mangrove untuk mitigasi abrasi dan peningkatan biodiversitas",
        category: "conservation",
        status: "pending",
        riskLevel: "medium",
        roi: 78,
        confidence: 88,
        createdAt: "2025-01-20",
        deadline: "2025-03-01",
        stakeholders: 8,
      },
      {
        id: "3",
        title: "Sistem Peringatan Dini Kebakaran",
        description: "Implementasi teknologi IoT dan AI untuk deteksi dini risiko kebakaran hutan dan lahan",
        category: "disaster",
        status: "active",
        riskLevel: "high",
        roi: 95,
        confidence: 85,
        createdAt: "2025-01-18",
        deadline: "2025-02-28",
        stakeholders: 15,
      },
      {
        id: "4",
        title: "Pengelolaan Hutan Berkelanjutan",
        description: "Strategi pengelolaan hutan produksi dengan prinsip sustainability dan sertifikasi FSC",
        category: "forestry",
        status: "completed",
        riskLevel: "low",
        roi: 72,
        confidence: 94,
        createdAt: "2025-01-10",
        deadline: "2025-01-30",
        stakeholders: 6,
      },
    ]
    setScenarios(sampleScenarios)
  }, [])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "agriculture":
        return "🌾"
      case "forestry":
        return "🌲"
      case "disaster":
        return "🚨"
      case "conservation":
        return "🌿"
      default:
        return "📊"
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "agriculture":
        return "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-300 shadow-sm"
      case "forestry":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300 shadow-sm"
      case "disaster":
        return "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-300 shadow-sm"
      case "conservation":
        return "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-300 shadow-sm"
      default:
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-300 shadow-sm"
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 shadow-sm"
      case "medium":
        return "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 shadow-sm"
      case "high":
        return "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 shadow-sm"
      default:
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 shadow-sm"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Activity className="w-4 h-4 text-blue-500" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const handleCreateScenario = () => {
    if (newScenario.title && newScenario.description && newScenario.category && newScenario.deadline) {
      const scenario: Scenario = {
        id: Date.now().toString(),
        title: newScenario.title,
        description: newScenario.description,
        category: newScenario.category as any,
        status: "pending",
        riskLevel: "medium",
        roi: Math.floor(Math.random() * 30) + 70,
        confidence: Math.floor(Math.random() * 20) + 80,
        createdAt: new Date().toISOString().split("T")[0],
        deadline: newScenario.deadline,
        stakeholders: Math.floor(Math.random() * 10) + 5,
      }

      setScenarios([...scenarios, scenario])
      setNewScenario({ title: "", description: "", category: "", deadline: "" })
      setIsCreateDialogOpen(false)
    }
  }

  const stats = {
    totalScenarios: scenarios.length,
    activeScenarios: scenarios.filter((s) => s.status === "active").length,
    completedScenarios: scenarios.filter((s) => s.status === "completed").length,
    averageROI: Math.round(scenarios.reduce((sum, s) => sum + s.roi, 0) / scenarios.length) || 0,
    averageConfidence: Math.round(scenarios.reduce((sum, s) => sum + s.confidence, 0) / scenarios.length) || 0,
  }

  // Mobile Navigation Component
  const MobileNavigation = () => (
    <nav className="space-y-2 px-4 py-6">
      <Link href="/dashboard">
        <Button
          variant="ghost"
          className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 rounded-xl group"
        >
          <LayoutDashboard className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Dashboard</span>
        </Button>
      </Link>
      <Link href="/fields">
        <Button
          variant="ghost"
          className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 rounded-xl group"
        >
          <MapPin className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
          <span className="font-medium">My Fields</span>
        </Button>
      </Link>
      <Link href="/maps">
        <Button
          variant="ghost"
          className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 rounded-xl group"
        >
          <Map className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
          <Download className="w-3 h-3 mr-1" />
          <span className="font-medium">Maps & Export</span>
        </Button>
      </Link>
      <Link href="/disaster-alerts">
        <Button
          variant="ghost"
          className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 rounded-xl group"
        >
          <AlertTriangle className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Disaster Alerts</span>
        </Button>
      </Link>
      <Link href="/eco-services">
        <Button
          variant="ghost"
          className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 rounded-xl group"
        >
          <TreePine className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Eco Services</span>
        </Button>
      </Link>
      <Button
        variant="secondary"
        className="w-full justify-start bg-gradient-to-r from-white/90 to-white/80 text-emerald-800 shadow-xl border border-emerald-200/50 hover:bg-gradient-to-r hover:from-white hover:to-white/95 hover:shadow-2xl transition-all duration-300 backdrop-blur-md rounded-xl group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <Brain className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform relative z-10" />
        <span className="font-semibold relative z-10">Decision Support</span>
        <Sparkles className="w-3 h-3 ml-auto text-emerald-600 relative z-10" />
      </Button>
      <Link href="/">
        <Button
          variant="ghost"
          className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 rounded-xl group"
        >
          <Home className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Main Menu</span>
        </Button>
      </Link>

      <div className="border-t border-emerald-200/30 pt-4 mt-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 rounded-xl group"
        >
          <Settings className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Settings</span>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 rounded-xl group"
        >
          <HelpCircle className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Help Center</span>
        </Button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex">
      {/* Desktop Sidebar - Hidden on Mobile */}
      <div className="hidden lg:flex w-64 bg-gradient-to-b from-emerald-50 via-teal-50 to-cyan-50 flex-col min-h-screen shadow-2xl border-r border-emerald-200/50 relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]"></div>
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Premium Header with enhanced styling */}
        <div className="relative z-10 flex items-center gap-3 p-6 pb-4 border-b border-emerald-200/30 bg-white/30 backdrop-blur-md">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-emerald-800 tracking-wide">EcoSentra</span>
            <span className="text-xs text-emerald-600 font-medium">Decision Intelligence</span>
          </div>
        </div>

        {/* Enhanced Main Navigation */}
        <nav className="relative z-10 space-y-2 px-4 flex-1 py-6">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 hover:translate-x-1 rounded-xl group"
            >
              <LayoutDashboard className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Dashboard</span>
            </Button>
          </Link>
          <Link href="/fields">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 hover:translate-x-1 rounded-xl group"
            >
              <MapPin className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
              <span className="font-medium">My Fields</span>
            </Button>
          </Link>
          <Link href="/maps">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 hover:translate-x-1 rounded-xl group"
            >
              <Map className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
              <Download className="w-3 h-3 mr-1" />
              <span className="font-medium">Maps & Export</span>
            </Button>
          </Link>
          <Link href="/disaster-alerts">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 hover:translate-x-1 rounded-xl group"
            >
              <AlertTriangle className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Disaster Alerts</span>
            </Button>
          </Link>
          <Link href="/eco-services">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 hover:translate-x-1 rounded-xl group"
            >
              <TreePine className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Eco Services</span>
            </Button>
          </Link>
          <Button
            variant="secondary"
            className="w-full justify-start bg-gradient-to-r from-white/90 to-white/80 text-emerald-800 shadow-xl border border-emerald-200/50 hover:bg-gradient-to-r hover:from-white hover:to-white/95 hover:shadow-2xl transition-all duration-300 backdrop-blur-md rounded-xl group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <Brain className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform relative z-10" />
            <span className="font-semibold relative z-10">Decision Support</span>
            <Sparkles className="w-3 h-3 ml-auto text-emerald-600 relative z-10" />
          </Button>
          <Link href="/">
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 hover:translate-x-1 rounded-xl group"
            >
              <Home className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Main Menu</span>
            </Button>
          </Link>
        </nav>

        {/* Enhanced Bottom Navigation */}
        <div className="relative z-10 space-y-2 px-4 pb-6 border-t border-emerald-200/30 pt-4 bg-white/20 backdrop-blur-md">
          <Button
            variant="ghost"
            className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 hover:translate-x-1 rounded-xl group"
          >
            <Settings className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Settings</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-emerald-700 hover:bg-white/50 hover:shadow-lg transition-all duration-300 hover:translate-x-1 rounded-xl group"
          >
            <HelpCircle className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Help Center</span>
          </Button>
        </div>
      </div>

      {/* Enhanced Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile & Desktop Header */}
        <div className="flex justify-between items-center p-4 lg:p-8 pb-4 lg:pb-6 bg-gradient-to-r from-white/80 via-white/70 to-white/60 backdrop-blur-md border-b border-white/50 shadow-sm">
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Mobile Menu Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden bg-white/80 border-emerald-200">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-64 bg-gradient-to-b from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200/50"
              >
                <div className="flex items-center gap-3 p-4 pb-4 border-b border-emerald-200/30">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                    <Leaf className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-emerald-800">EcoSentra</span>
                    <span className="text-xs text-emerald-600 font-medium">Decision Intelligence</span>
                  </div>
                </div>
                <MobileNavigation />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2 lg:gap-3">
              <div className="p-1.5 lg:p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-lg">
                <Brain className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg lg:text-2xl font-bold text-gray-800">Decision Support System</h1>
                <p className="text-xs lg:text-sm text-gray-600 hidden sm:block">
                  AI-Powered Land Management Intelligence
                </p>
              </div>
            </div>

            {/* Desktop Badges - Hidden on Mobile */}
            <div className="hidden lg:flex gap-2">
              <Badge
                variant="outline"
                className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border-purple-300 shadow-sm"
              >
                <Zap className="w-3 h-3 mr-1" />
                AI-Powered
              </Badge>
              <Badge
                variant="outline"
                className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300 shadow-sm"
              >
                <Leaf className="w-3 h-3 mr-1" />
                Sustainable
              </Badge>
              <Badge
                variant="outline"
                className="bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-300 shadow-sm"
              >
                <Star className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-1 lg:gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-xs lg:text-sm px-3 lg:px-4">
                  <Plus className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">New Scenario</span>
                  <span className="sm:hidden">New</span>
                  <Sparkles className="w-2 h-2 lg:w-3 lg:h-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-4 bg-white/95 backdrop-blur-md border border-white/50 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Create New Decision Scenario
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                      Scenario Title
                    </Label>
                    <Input
                      id="title"
                      value={newScenario.title}
                      onChange={(e) => setNewScenario({ ...newScenario, title: e.target.value })}
                      placeholder="Enter scenario title"
                      className="mt-1 bg-white/80 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={newScenario.description}
                      onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                      placeholder="Describe the scenario"
                      rows={3}
                      className="mt-1 bg-white/80 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                      Category
                    </Label>
                    <Select
                      value={newScenario.category}
                      onValueChange={(value) => setNewScenario({ ...newScenario, category: value })}
                    >
                      <SelectTrigger className="mt-1 bg-white/80 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-md border border-white/50">
                        <SelectItem value="agriculture">🌾 Agriculture</SelectItem>
                        <SelectItem value="forestry">🌲 Forestry</SelectItem>
                        <SelectItem value="disaster">🚨 Disaster Management</SelectItem>
                        <SelectItem value="conservation">🌿 Conservation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="deadline" className="text-sm font-medium text-gray-700">
                      Deadline
                    </Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={newScenario.deadline}
                      onChange={(e) => setNewScenario({ ...newScenario, deadline: e.target.value })}
                      className="mt-1 bg-white/80 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                  <Button
                    onClick={handleCreateScenario}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Create Scenario
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Enhanced Statistics Cards */}
        <div className="p-4 lg:p-8 pt-4 lg:pt-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-6 mb-6 lg:mb-8">
            <Card className="bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-md shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs lg:text-sm font-medium text-gray-600">Total Scenarios</p>
                    <p className="text-lg lg:text-2xl font-bold text-gray-900">{stats.totalScenarios}</p>
                    <p className="text-xs text-green-600 mt-1 hidden lg:block">+2 this week</p>
                  </div>
                  <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl group-hover:scale-110 transition-transform">
                    <FileText className="w-4 h-4 lg:w-6 lg:h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-md shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs lg:text-sm font-medium text-gray-600">Active</p>
                    <p className="text-lg lg:text-2xl font-bold text-blue-600">{stats.activeScenarios}</p>
                    <p className="text-xs text-blue-600 mt-1 hidden lg:block">In progress</p>
                  </div>
                  <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl group-hover:scale-110 transition-transform">
                    <Activity className="w-4 h-4 lg:w-6 lg:h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-md shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs lg:text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-lg lg:text-2xl font-bold text-green-600">{stats.completedScenarios}</p>
                    <p className="text-xs text-green-600 mt-1 hidden lg:block">Success rate 94%</p>
                  </div>
                  <div className="p-2 lg:p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-4 h-4 lg:w-6 lg:h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-md shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs lg:text-sm font-medium text-gray-600">Avg ROI</p>
                    <p className="text-lg lg:text-2xl font-bold text-emerald-600">{stats.averageROI}%</p>
                    <p className="text-xs text-emerald-600 mt-1 hidden lg:block">+12% vs target</p>
                  </div>
                  <div className="p-2 lg:p-3 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-4 h-4 lg:w-6 lg:h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-md shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 hover:scale-105 group col-span-2 lg:col-span-1">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs lg:text-sm font-medium text-gray-600">Confidence</p>
                    <p className="text-lg lg:text-2xl font-bold text-purple-600">{stats.averageConfidence}%</p>
                    <p className="text-xs text-purple-600 mt-1 hidden lg:block">High accuracy</p>
                  </div>
                  <div className="p-2 lg:p-3 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl group-hover:scale-110 transition-transform">
                    <Target className="w-4 h-4 lg:w-6 lg:h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Scenarios Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
            {scenarios.map((scenario) => (
              <Card
                key={scenario.id}
                className="bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-md shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardHeader className="pb-3 lg:pb-4 relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 lg:gap-3">
                      <div className="text-2xl lg:text-3xl p-1.5 lg:p-2 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                        {getCategoryIcon(scenario.category)}
                      </div>
                      <div>
                        <CardTitle className="text-base lg:text-lg font-semibold text-gray-800 group-hover:text-gray-900 transition-colors line-clamp-2">
                          {scenario.title}
                        </CardTitle>
                        <div className="flex items-center gap-1 lg:gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className={`${getCategoryColor(scenario.category)} text-xs`}>
                            {scenario.category}
                          </Badge>
                          <Badge variant="outline" className={`${getRiskColor(scenario.riskLevel)} text-xs`}>
                            {scenario.riskLevel} risk
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 lg:gap-2 bg-white/50 px-2 lg:px-3 py-1 rounded-full backdrop-blur-sm">
                      {getStatusIcon(scenario.status)}
                      <span className="text-xs lg:text-sm text-gray-600 capitalize font-medium">{scenario.status}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 lg:space-y-4 relative z-10">
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{scenario.description}</p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                    <div className="space-y-2 p-2 lg:p-3 bg-white/50 rounded-lg backdrop-blur-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs lg:text-sm text-gray-500 font-medium">ROI Potential</span>
                        <span className="font-bold text-emerald-600 text-sm lg:text-base">{scenario.roi}%</span>
                      </div>
                      <Progress value={scenario.roi} className="h-1.5 lg:h-2" />
                    </div>
                    <div className="space-y-2 p-2 lg:p-3 bg-white/50 rounded-lg backdrop-blur-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs lg:text-sm text-gray-500 font-medium">Confidence</span>
                        <span className="font-bold text-blue-600 text-sm lg:text-base">{scenario.confidence}%</span>
                      </div>
                      <Progress value={scenario.confidence} className="h-1.5 lg:h-2" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs lg:text-sm text-gray-500 bg-white/30 p-2 lg:p-3 rounded-lg backdrop-blur-sm">
                    <div className="flex items-center gap-1 lg:gap-2">
                      <Calendar className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span className="font-medium">Due: {scenario.deadline}</span>
                    </div>
                    <div className="flex items-center gap-1 lg:gap-2">
                      <Users className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span className="font-medium">{scenario.stakeholders} stakeholders</span>
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full bg-gradient-to-r from-white/80 to-white/60 hover:from-white hover:to-white/90 border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 group-hover:scale-105 text-sm"
                        onClick={() => setSelectedScenario(scenario)}
                      >
                        <span className="font-medium">View Details</span>
                        <Sparkles className="w-3 h-3 lg:w-4 lg:h-4 ml-2" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-md border border-white/50 shadow-2xl mx-4">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-lg lg:text-xl">
                          <span className="text-2xl lg:text-3xl">{getCategoryIcon(scenario.category)}</span>
                          <div>
                            <div>{scenario.title}</div>
                            <div className="text-sm font-normal text-gray-600 mt-1">
                              Detailed Analysis & Recommendations
                            </div>
                          </div>
                        </DialogTitle>
                      </DialogHeader>
                      <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-gray-100/80 backdrop-blur-sm">
                          <TabsTrigger value="overview" className="font-medium text-xs lg:text-sm">
                            Overview
                          </TabsTrigger>
                          <TabsTrigger value="recommendations" className="font-medium text-xs lg:text-sm">
                            Recommendations
                          </TabsTrigger>
                          <TabsTrigger value="analysis" className="font-medium text-xs lg:text-sm">
                            Analysis
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview" className="space-y-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="space-y-2 p-3 lg:p-4 bg-gray-50/80 rounded-lg backdrop-blur-sm">
                              <Label className="font-medium text-gray-700">Category</Label>
                              <Badge className={getCategoryColor(scenario.category)}>{scenario.category}</Badge>
                            </div>
                            <div className="space-y-2 p-3 lg:p-4 bg-gray-50/80 rounded-lg backdrop-blur-sm">
                              <Label className="font-medium text-gray-700">Status</Label>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(scenario.status)}
                                <span className="capitalize font-medium">{scenario.status}</span>
                              </div>
                            </div>
                            <div className="space-y-2 p-3 lg:p-4 bg-gray-50/80 rounded-lg backdrop-blur-sm">
                              <Label className="font-medium text-gray-700">Risk Level</Label>
                              <Badge className={getRiskColor(scenario.riskLevel)}>{scenario.riskLevel}</Badge>
                            </div>
                            <div className="space-y-2 p-3 lg:p-4 bg-gray-50/80 rounded-lg backdrop-blur-sm">
                              <Label className="font-medium text-gray-700">Stakeholders</Label>
                              <span className="font-medium">{scenario.stakeholders} people involved</span>
                            </div>
                          </div>
                          <div className="space-y-2 p-3 lg:p-4 bg-gray-50/80 rounded-lg backdrop-blur-sm">
                            <Label className="font-medium text-gray-700">Description</Label>
                            <p className="text-sm text-gray-600 leading-relaxed">{scenario.description}</p>
                          </div>
                        </TabsContent>
                        <TabsContent value="recommendations" className="space-y-4">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Lightbulb className="w-5 h-5 text-yellow-500" />
                              <h3 className="font-semibold text-base lg:text-lg">AI-Generated Recommendations</h3>
                              <Badge className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800">
                                <Zap className="w-3 h-3 mr-1" />
                                AI-Powered
                              </Badge>
                            </div>
                            <div className="space-y-3">
                              <div className="p-3 lg:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
                                <h4 className="font-semibold text-green-800 flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4" />
                                  Primary Recommendation
                                </h4>
                                <p className="text-sm text-green-700 mt-2 leading-relaxed">
                                  Implement phased approach with pilot testing in 20% of target area first. This reduces
                                  risk while allowing for optimization based on initial results.
                                </p>
                              </div>
                              <div className="p-3 lg:p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
                                <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4" />
                                  Risk Mitigation
                                </h4>
                                <p className="text-sm text-blue-700 mt-2 leading-relaxed">
                                  Establish comprehensive monitoring protocols and contingency plans for weather
                                  variations and market fluctuations.
                                </p>
                              </div>
                              <div className="p-3 lg:p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 shadow-sm">
                                <h4 className="font-semibold text-purple-800 flex items-center gap-2">
                                  <Zap className="w-4 h-4" />
                                  Optimization
                                </h4>
                                <p className="text-sm text-purple-700 mt-2 leading-relaxed">
                                  Leverage IoT sensors and machine learning for real-time data collection and automated
                                  decision making to maximize efficiency.
                                </p>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="analysis" className="space-y-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <h3 className="font-semibold flex items-center gap-2 text-base lg:text-lg">
                                <BarChart3 className="w-5 h-5 text-blue-500" />
                                Performance Metrics
                              </h3>
                              <div className="space-y-4">
                                <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg">
                                  <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium">ROI Potential</span>
                                    <span className="text-sm font-bold text-emerald-600">{scenario.roi}%</span>
                                  </div>
                                  <Progress value={scenario.roi} className="h-3" />
                                </div>
                                <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg">
                                  <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium">Confidence Level</span>
                                    <span className="text-sm font-bold text-blue-600">{scenario.confidence}%</span>
                                  </div>
                                  <Progress value={scenario.confidence} className="h-3" />
                                </div>
                                <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg">
                                  <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium">Implementation Readiness</span>
                                    <span className="text-sm font-bold text-purple-600">78%</span>
                                  </div>
                                  <Progress value={78} className="h-3" />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h3 className="font-semibold flex items-center gap-2 text-base lg:text-lg">
                                <DollarSign className="w-5 h-5 text-green-500" />
                                Financial Impact
                              </h3>
                              <div className="space-y-3 p-3 lg:p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Initial Investment</span>
                                  <span className="font-semibold">$125,000</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Expected Return</span>
                                  <span className="font-semibold text-green-600">$231,250</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Payback Period</span>
                                  <span className="font-semibold">18 months</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                  <span className="text-sm font-semibold">Net Benefit</span>
                                  <span className="font-bold text-green-600">$106,250</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* AskLandAI Component */}
      <AskLandAI />
    </div>
  )
}
