"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Leaf,
  LayoutDashboard,
  MapPin,
  Map,
  AlertTriangle,
  TreePine,
  Brain,
  ArrowRight,
  Satellite,
  BarChart3,
  Shield,
} from "lucide-react"
import Link from "next/link"
import { AskLandAI } from "@/components/ask-land-ai"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>

        <div className="relative z-10 container mx-auto px-6 py-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo and Title */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-2xl">
                <Leaf className="w-12 h-12 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-5xl font-bold text-emerald-800 tracking-tight">EcoSentra</h1>
                <p className="text-xl text-emerald-600 font-medium">Intelligent Land Classification System</p>
              </div>
            </div>

            {/* Main Description */}
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Advanced satellite-based land classification and environmental monitoring platform for Indonesia's diverse
              ecosystems. Powered by AI and real-time satellite data.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                >
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/about">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-transparent"
                >
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/50">
                <div className="text-3xl font-bold text-emerald-600 mb-2">1.9M</div>
                <div className="text-gray-600">km² Monitored</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/50">
                <div className="text-3xl font-bold text-teal-600 mb-2">30m</div>
                <div className="text-gray-600">Resolution</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/50">
                <div className="text-3xl font-bold text-cyan-600 mb-2">24/7</div>
                <div className="text-gray-600">Monitoring</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/50">
                <div className="text-3xl font-bold text-blue-600 mb-2">AI</div>
                <div className="text-gray-600">Powered</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Comprehensive Land Monitoring</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Advanced tools for environmental monitoring, land classification, and decision support across Indonesia's
              diverse landscapes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Dashboard */}
            <Link href="/dashboard">
              <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-white/80 backdrop-blur-sm border border-white/50 cursor-pointer">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <LayoutDashboard className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-800">Dashboard</CardTitle>
                  <CardDescription>
                    Real-time overview of land classification data, environmental metrics, and system status across
                    Indonesia.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-blue-600 font-medium">
                    View Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Maps & Export */}
            <Link href="/maps">
              <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-white/80 backdrop-blur-sm border border-white/50 cursor-pointer">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Map className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-800">Maps & Export</CardTitle>
                  <CardDescription>
                    Interactive land classification maps with export capabilities for GIS analysis and research
                    purposes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-emerald-600 font-medium">
                    Explore Maps <ArrowRight className="ml-2 w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Field Classification */}
            <Link href="/fields">
              <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-white/80 backdrop-blur-sm border border-white/50 cursor-pointer">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-800">Field Classification</CardTitle>
                  <CardDescription>
                    Detailed analysis of specific land parcels with crop identification, health monitoring, and yield
                    prediction.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-green-600 font-medium">
                    Analyze Fields <ArrowRight className="ml-2 w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Disaster Alerts */}
            <Link href="/disaster-alerts">
              <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-white/80 backdrop-blur-sm border border-white/50 cursor-pointer">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-800">Disaster Alerts</CardTitle>
                  <CardDescription>
                    Early warning system for natural disasters, deforestation alerts, and environmental hazards.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-red-600 font-medium">
                    View Alerts <ArrowRight className="ml-2 w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Eco Services */}
            <Link href="/eco-services">
              <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-white/80 backdrop-blur-sm border border-white/50 cursor-pointer">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <TreePine className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-800">Ecosystem Services</CardTitle>
                  <CardDescription>
                    Carbon sequestration tracking, biodiversity monitoring, and ecosystem health assessment tools.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-teal-600 font-medium">
                    Explore Services <ArrowRight className="ml-2 w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Decision Support */}
            <Link href="/decision-support">
              <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-white/80 backdrop-blur-sm border border-white/50 cursor-pointer">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-800">Decision Support</CardTitle>
                  <CardDescription>
                    AI-powered recommendations for land use planning, conservation strategies, and policy decisions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-purple-600 font-medium">
                    Get Insights <ArrowRight className="ml-2 w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>

      {/* Technology Section */}
      <div className="py-20 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Powered by Advanced Technology</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Cutting-edge satellite imagery, machine learning, and real-time data processing for accurate land
              classification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Satellite className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Satellite Data</h3>
              <p className="text-gray-600">Landsat 8/9 and Sentinel-2 imagery for comprehensive land monitoring</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">AI Classification</h3>
              <p className="text-gray-600">Machine learning algorithms for accurate land cover classification</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Real-time Analytics</h3>
              <p className="text-gray-600">Live data processing and analysis for immediate insights</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Early Warning</h3>
              <p className="text-gray-600">Proactive alerts for environmental changes and disasters</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Leaf className="w-6 h-6 text-emerald-400" />
                <span className="text-xl font-bold">EcoSentra</span>
              </div>
              <p className="text-gray-400">
                Advanced land classification and environmental monitoring for Indonesia's sustainable future.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Land Classification</li>
                <li>Satellite Monitoring</li>
                <li>Disaster Alerts</li>
                <li>Data Export</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Documentation</li>
                <li>API Reference</li>
                <li>Tutorials</li>
                <li>Support</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>info@ecosentra.id</li>
                <li>+62 21 1234 5678</li>
                <li>Jakarta, Indonesia</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 EcoSentra. All rights reserved. Built for GEMASTIK 2025.</p>
          </div>
        </div>
      </footer>

      {/* AskLandAI Component */}
      <AskLandAI />
    </div>
  )
}
