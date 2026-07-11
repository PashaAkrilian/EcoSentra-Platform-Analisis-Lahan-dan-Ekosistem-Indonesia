"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCcw, Layers, MapPin } from "lucide-react"

interface FireData {
  latitude: number
  longitude: number
  brightness: number
  confidence: number
  acq_date: string
}

interface LeafletMapProps {
  selectedLayer: string
  fireData: FireData[]
  onMapClick: (lat: number, lng: number) => void
}

// Declare Leaflet types
declare global {
  interface Window {
    L: any
  }
}

export default function LeafletMap({ selectedLayer, fireData, onMapClick }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(5)
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const layerGroupsRef = useRef<{ [key: string]: any }>({})

  // Indonesia bounds - focused specifically on Indonesia
  const indonesiaBounds = [
    [-11.0, 95.0], // Southwest Indonesia (southern Java/Nusa Tenggara)
    [6.0, 141.0], // Northeast Indonesia (northern Sumatra to eastern Papua)
  ]

  // Indonesia center - optimized for the archipelago
  const indonesiaCenter = [-2.5, 118.0] // Central Indonesia

  useEffect(() => {
    if (typeof window !== "undefined" && !window.L) {
      // Load Leaflet CSS
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)

      // Load Leaflet JS
      const script = document.createElement("script")
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      script.onload = () => {
        setIsLoaded(true)
      }
      document.head.appendChild(script)
    } else if (window.L) {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (isLoaded && mapRef.current && !mapInstanceRef.current) {
      initializeMap()
    }
  }, [isLoaded])

  useEffect(() => {
    if (mapInstanceRef.current) {
      updateMapLayer()
    }
  }, [selectedLayer])

  useEffect(() => {
    if (mapInstanceRef.current) {
      updateFireData()
    }
  }, [fireData])

  const initializeMap = () => {
    if (!mapRef.current || !window.L) return

    // Initialize map with Indonesia focus
    const map = window.L.map(mapRef.current, {
      center: indonesiaCenter,
      zoom: 5, // Good zoom level to see all of Indonesia
      minZoom: 4,
      maxZoom: 18,
      maxBounds: indonesiaBounds,
      maxBoundsViscosity: 1.0,
      zoomControl: false, // We'll add custom controls
    })

    mapInstanceRef.current = map

    // Add default OpenStreetMap layer
    const osmLayer = window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    })
    osmLayer.addTo(map)
    layerGroupsRef.current.osm = osmLayer

    // Add click handler
    map.on("click", (e: any) => {
      const { lat, lng } = e.latlng
      setClickedCoords({ lat, lng })
      onMapClick(lat, lng)

      // Add marker for clicked location
      if (layerGroupsRef.current.clickMarker) {
        map.removeLayer(layerGroupsRef.current.clickMarker)
      }

      const marker = window.L.marker([lat, lng], {
        icon: window.L.divIcon({
          className: "click-marker",
          html: '<div style="background: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        }),
      }).addTo(map)

      layerGroupsRef.current.clickMarker = marker
    })

    // Add zoom handler
    map.on("zoomend", () => {
      setCurrentZoom(map.getZoom())
    })

    // Add Indonesian cities
    addIndonesianCities(map)

    // Add Indonesian province boundaries
    addIndonesianProvinces(map)

    // Initial layer setup
    updateMapLayer()
    updateFireData()

    // Fit to Indonesia bounds initially
    map.fitBounds(indonesiaBounds, { padding: [20, 20] })
  }

  const addIndonesianCities = (map: any) => {
    const indonesianCities = [
      // Java - Major cities
      { name: "Jakarta", lat: -6.2088, lng: 106.8456, population: "10.6M", province: "DKI Jakarta", type: "capital" },
      { name: "Surabaya", lat: -7.2575, lng: 112.7521, population: "2.9M", province: "Jawa Timur", type: "major" },
      { name: "Bandung", lat: -6.9175, lng: 107.6191, population: "2.5M", province: "Jawa Barat", type: "major" },
      { name: "Semarang", lat: -6.9667, lng: 110.4167, population: "1.7M", province: "Jawa Tengah", type: "major" },
      {
        name: "Yogyakarta",
        lat: -7.7956,
        lng: 110.3695,
        population: "0.4M",
        province: "DI Yogyakarta",
        type: "cultural",
      },

      // Sumatra - Major cities
      { name: "Medan", lat: 3.5952, lng: 98.6722, population: "2.4M", province: "Sumatra Utara", type: "major" },
      {
        name: "Palembang",
        lat: -2.9761,
        lng: 104.7754,
        population: "1.7M",
        province: "Sumatra Selatan",
        type: "major",
      },
      { name: "Pekanbaru", lat: 0.5071, lng: 101.4478, population: "1.1M", province: "Riau", type: "major" },
      { name: "Padang", lat: -0.9471, lng: 100.4172, population: "0.9M", province: "Sumatra Barat", type: "major" },
      { name: "Bandar Lampung", lat: -5.4292, lng: 105.261, population: "1.2M", province: "Lampung", type: "major" },

      // Kalimantan - Major cities
      {
        name: "Banjarmasin",
        lat: -3.3194,
        lng: 114.5906,
        population: "0.7M",
        province: "Kalimantan Selatan",
        type: "major",
      },
      {
        name: "Pontianak",
        lat: -0.0263,
        lng: 109.3425,
        population: "0.6M",
        province: "Kalimantan Barat",
        type: "major",
      },
      {
        name: "Samarinda",
        lat: -0.5022,
        lng: 117.1536,
        population: "0.8M",
        province: "Kalimantan Timur",
        type: "major",
      },
      {
        name: "Palangka Raya",
        lat: -2.208,
        lng: 113.9178,
        population: "0.3M",
        province: "Kalimantan Tengah",
        type: "regional",
      },

      // Sulawesi - Major cities
      {
        name: "Makassar",
        lat: -5.1477,
        lng: 119.4327,
        population: "1.4M",
        province: "Sulawesi Selatan",
        type: "major",
      },
      { name: "Manado", lat: 1.4748, lng: 124.8421, population: "0.4M", province: "Sulawesi Utara", type: "regional" },
      { name: "Palu", lat: -0.8917, lng: 119.8707, population: "0.4M", province: "Sulawesi Tengah", type: "regional" },
      {
        name: "Kendari",
        lat: -3.945,
        lng: 122.5986,
        population: "0.3M",
        province: "Sulawesi Tenggara",
        type: "regional",
      },

      // Papua - Major cities
      { name: "Jayapura", lat: -2.5489, lng: 140.7197, population: "0.4M", province: "Papua", type: "regional" },
      { name: "Sorong", lat: -0.8784, lng: 131.2547, population: "0.3M", province: "Papua Barat", type: "regional" },

      // Bali & Nusa Tenggara
      { name: "Denpasar", lat: -8.65, lng: 115.2167, population: "0.9M", province: "Bali", type: "tourism" },
      {
        name: "Mataram",
        lat: -8.5833,
        lng: 116.1167,
        population: "0.4M",
        province: "Nusa Tenggara Barat",
        type: "regional",
      },
      {
        name: "Kupang",
        lat: -10.1718,
        lng: 123.6075,
        population: "0.4M",
        province: "Nusa Tenggara Timur",
        type: "regional",
      },

      // Maluku
      { name: "Ambon", lat: -3.6954, lng: 128.1814, population: "0.4M", province: "Maluku", type: "regional" },
    ]

    const cityGroup = window.L.layerGroup()

    indonesianCities.forEach((city) => {
      // Different styling based on city type
      let cityColor = "#1f2937"
      let citySize = "11px"
      let cityIcon = "🏙️"

      switch (city.type) {
        case "capital":
          cityColor = "#dc2626"
          citySize = "13px"
          cityIcon = "🏛️"
          break
        case "major":
          cityColor = "#2563eb"
          citySize = "12px"
          cityIcon = "🏙️"
          break
        case "cultural":
          cityColor = "#7c3aed"
          cityIcon = "🏛️"
          break
        case "tourism":
          cityColor = "#059669"
          cityIcon = "🏖️"
          break
        default:
          cityColor = "#374151"
          cityIcon = "🏘️"
      }

      const marker = window.L.marker([city.lat, city.lng], {
        icon: window.L.divIcon({
          className: "city-marker",
          html: `
            <div style="
              background: linear-gradient(135deg, ${cityColor} 0%, ${cityColor}dd 100%); 
              color: white; 
              padding: 4px 8px; 
              border-radius: 12px; 
              font-size: ${citySize}; 
              font-weight: bold;
              border: 2px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              white-space: nowrap;
              position: relative;
            ">
              ${cityIcon} ${city.name}
              <div style="
                position: absolute;
                bottom: -6px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 4px solid transparent;
                border-right: 4px solid transparent;
                border-top: 4px solid ${cityColor};
              "></div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
      })

      marker.bindPopup(`
        <div style="text-align: center; padding: 12px; min-width: 220px;">
          <h3 style="margin: 0 0 8px 0; color: ${cityColor}; font-size: 16px;">${cityIcon} ${city.name}</h3>
          <div style="background: #f3f4f6; padding: 8px; border-radius: 8px; margin-bottom: 8px;">
            <p style="margin: 0; color: #374151; font-size: 13px; font-weight: 600;">
              🇮🇩 ${city.province}
            </p>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 12px;">Population:</span>
            <span style="color: #1f2937; font-weight: bold; font-size: 12px;">${city.population}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 12px;">Type:</span>
            <span style="color: ${cityColor}; font-weight: bold; font-size: 12px; text-transform: capitalize;">${city.type}</span>
          </div>
          <div style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">
            <p style="margin: 0; color: #6b7280; font-size: 11px;">
              ${city.lat.toFixed(4)}°, ${city.lng.toFixed(4)}°
            </p>
          </div>
        </div>
      `)

      cityGroup.addLayer(marker)
    })

    cityGroup.addTo(map)
    layerGroupsRef.current.cities = cityGroup
  }

  const addIndonesianProvinces = (map: any) => {
    // Add simplified Indonesian province boundaries
    const provinces = [
      {
        name: "Sumatra",
        bounds: [
          [6.0, 95.0],
          [-6.0, 106.0],
        ],
        color: "#dc2626",
        description: "Pulau terbesar ke-6 di dunia",
      },
      {
        name: "Java",
        bounds: [
          [-5.5, 105.0],
          [-8.8, 115.0],
        ],
        color: "#2563eb",
        description: "Pulau terpadat di Indonesia",
      },
      {
        name: "Kalimantan",
        bounds: [
          [4.5, 108.0],
          [-4.5, 119.0],
        ],
        color: "#059669",
        description: "Bagian Indonesia dari Pulau Borneo",
      },
      {
        name: "Sulawesi",
        bounds: [
          [2.0, 118.0],
          [-6.0, 125.0],
        ],
        color: "#7c3aed",
        description: "Pulau berbentuk unik seperti anggrek",
      },
      {
        name: "Papua",
        bounds: [
          [-1.0, 130.0],
          [-9.0, 141.0],
        ],
        color: "#ea580c",
        description: "Bagian Indonesia dari Pulau New Guinea",
      },
      {
        name: "Bali & Nusa Tenggara",
        bounds: [
          [-8.0, 114.0],
          [-11.0, 125.0],
        ],
        color: "#8b5cf6",
        description: "Kepulauan wisata dan budaya",
      },
    ]

    const provinceGroup = window.L.layerGroup()

    provinces.forEach((province) => {
      const rectangle = window.L.rectangle(province.bounds, {
        color: province.color,
        weight: 2,
        opacity: 0.7,
        fillOpacity: 0.1,
        dashArray: "8, 4",
      })

      rectangle.bindPopup(`
        <div style="text-align: center; padding: 12px; min-width: 200px;">
          <h4 style="margin: 0 0 8px 0; color: ${province.color}; font-size: 16px;">🇮🇩 ${province.name}</h4>
          <p style="margin: 4px 0; font-size: 13px; color: #374151;">
            ${province.description}
          </p>
          <div style="background: #f3f4f6; padding: 6px; border-radius: 4px; margin-top: 8px;">
            <p style="margin: 0; font-size: 11px; color: #6b7280;">
              🌏 Kepulauan Indonesia
            </p>
          </div>
        </div>
      `)

      provinceGroup.addLayer(rectangle)
    })

    provinceGroup.addTo(map)
    layerGroupsRef.current.provinces = provinceGroup
  }

  const updateMapLayer = () => {
    if (!mapInstanceRef.current || !window.L) return

    const map = mapInstanceRef.current

    // Remove existing tile layers except cities, provinces, fires and markers
    Object.keys(layerGroupsRef.current).forEach((key) => {
      if (key !== "cities" && key !== "fires" && key !== "clickMarker" && key !== "provinces") {
        map.removeLayer(layerGroupsRef.current[key])
      }
    })

    let tileLayer

    switch (selectedLayer) {
      case "satellite":
        // Esri World Imagery (Satellite) - Best for Indonesia
        tileLayer = window.L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "Tiles © Esri — Source: Esri, Maxar, GeoEye, Earthstar Geographics",
            maxZoom: 18,
          },
        )
        break

      case "terrain":
        // OpenTopoMap (Terrain) - Shows Indonesia's topography well
        tileLayer = window.L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
          attribution: "Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)",
          maxZoom: 17,
        })
        break

      case "landcover":
        // CartoDB Positron (Clean style for land cover analysis)
        tileLayer = window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution: "© OpenStreetMap contributors © CARTO",
          maxZoom: 19,
        })
        break

      case "ndvi":
        // Stamen Terrain (Good for vegetation analysis)
        tileLayer = window.L.tileLayer("https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png", {
          attribution: "Map tiles by Stamen Design, CC BY 3.0 — Map data © OpenStreetMap contributors",
          maxZoom: 18,
        })
        break

      case "temperature":
        // CartoDB Dark (Good contrast for temperature data)
        tileLayer = window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: "© OpenStreetMap contributors © CARTO",
          maxZoom: 19,
        })
        break

      case "fires":
        // Standard OSM for fire overlay
        tileLayer = window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 18,
        })
        break

      default:
        // Default OpenStreetMap
        tileLayer = window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 18,
        })
    }

    tileLayer.addTo(map)
    layerGroupsRef.current[selectedLayer] = tileLayer
  }

  const updateFireData = () => {
    if (!mapInstanceRef.current || !window.L) return

    const map = mapInstanceRef.current

    // Remove existing fire markers
    if (layerGroupsRef.current.fires) {
      map.removeLayer(layerGroupsRef.current.fires)
    }

    if (selectedLayer === "fires" && fireData.length > 0) {
      const fireGroup = window.L.layerGroup()

      fireData.forEach((fire, index) => {
        const size = Math.max(6, Math.min(16, (fire.brightness - 280) / 8))
        const opacity = Math.max(0.7, fire.confidence / 100)

        // Color based on confidence level
        let fireColor = "#ff4444"
        if (fire.confidence >= 90) fireColor = "#dc2626"
        else if (fire.confidence >= 80) fireColor = "#ef4444"
        else if (fire.confidence >= 70) fireColor = "#f87171"
        else fireColor = "#fca5a5"

        const fireMarker = window.L.circleMarker([fire.latitude, fire.longitude], {
          radius: size,
          fillColor: fireColor,
          color: "#991b1b",
          weight: 2,
          opacity: opacity,
          fillOpacity: opacity * 0.8,
        })

        // Add pulsing animation for high confidence fires
        if (fire.confidence >= 85) {
          const pulseMarker = window.L.circleMarker([fire.latitude, fire.longitude], {
            radius: size + 4,
            fillColor: fireColor,
            color: fireColor,
            weight: 1,
            opacity: 0.4,
            fillOpacity: 0.2,
          })
          fireGroup.addLayer(pulseMarker)
        }

        // Determine Indonesian region based on coordinates
        let region = "Indonesia"
        if (fire.latitude > -6 && fire.longitude < 106) region = "Sumatra"
        else if (fire.latitude < -5.5 && fire.latitude > -8.8 && fire.longitude > 105 && fire.longitude < 115)
          region = "Jawa"
        else if (fire.latitude > -4.5 && fire.latitude < 4.5 && fire.longitude > 108 && fire.longitude < 119)
          region = "Kalimantan"
        else if (fire.latitude > -6 && fire.latitude < 2 && fire.longitude > 118 && fire.longitude < 125)
          region = "Sulawesi"
        else if (fire.longitude > 130) region = "Papua"
        else if (fire.latitude < -8) region = "Nusa Tenggara"

        fireMarker.bindPopup(`
          <div style="padding: 12px; min-width: 220px; font-family: system-ui;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 20px; margin-right: 8px;">🔥</span>
              <h4 style="margin: 0; color: #dc2626; font-size: 16px;">Fire Hotspot Indonesia</h4>
            </div>
            
            <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                <div>
                  <span style="color: #6b7280;">Latitude:</span><br>
                  <strong style="color: #1f2937;">${fire.latitude.toFixed(4)}°</strong>
                </div>
                <div>
                  <span style="color: #6b7280;">Longitude:</span><br>
                  <strong style="color: #1f2937;">${fire.longitude.toFixed(4)}°</strong>
                </div>
              </div>
            </div>

            <div style="background: #eff6ff; padding: 6px; border-radius: 4px; margin-bottom: 8px; text-align: center;">
              <div style="font-size: 11px; color: #1e40af; font-weight: 600;">WILAYAH</div>
              <div style="font-size: 13px; font-weight: bold; color: #1d4ed8;">🇮🇩 ${region}</div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
              <div style="text-align: center; background: #fff7ed; padding: 6px; border-radius: 4px;">
                <div style="font-size: 11px; color: #9a3412; font-weight: 600;">BRIGHTNESS</div>
                <div style="font-size: 14px; font-weight: bold; color: #ea580c;">${fire.brightness.toFixed(1)}°K</div>
              </div>
              <div style="text-align: center; background: #f0fdf4; padding: 6px; border-radius: 4px;">
                <div style="font-size: 11px; color: #166534; font-weight: 600;">CONFIDENCE</div>
                <div style="font-size: 14px; font-weight: bold; color: ${fire.confidence >= 80 ? "#16a34a" : fire.confidence >= 70 ? "#ca8a04" : "#dc2626"};">${fire.confidence}%</div>
              </div>
            </div>

            <div style="background: #f9fafb; padding: 6px; border-radius: 4px; text-align: center;">
              <div style="font-size: 11px; color: #6b7280;">Detection Date</div>
              <div style="font-size: 12px; font-weight: 600; color: #374151;">${fire.acq_date}</div>
            </div>

            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <div style="font-size: 10px; color: #9ca3af; text-align: center;">
                📡 Data Source: NASA FIRMS VIIRS | 🇮🇩 Indonesia
              </div>
            </div>
          </div>
        `)

        fireGroup.addLayer(fireMarker)
      })

      fireGroup.addTo(map)
      layerGroupsRef.current.fires = fireGroup
    }
  }

  const zoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn()
    }
  }

  const zoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut()
    }
  }

  const resetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(indonesiaCenter, 5)
    }
  }

  const focusJava = () => {
    if (mapInstanceRef.current) {
      const javaBounds = [
        [-5.5, 105.0],
        [-8.8, 115.0],
      ]
      mapInstanceRef.current.fitBounds(javaBounds, { padding: [30, 50] })
    }
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex items-center justify-center min-h-[500px]">
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
            <span>🏙️ 25+ Cities</span>
            <span>•</span>
            <span>🔥 Fire Data</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Enhanced Map Controls */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          className="bg-white/95 backdrop-blur-sm shadow-lg hover:bg-white border-gray-200"
          onClick={zoomIn}
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-white/95 backdrop-blur-sm shadow-lg hover:bg-white border-gray-200"
          onClick={zoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-white/95 backdrop-blur-sm shadow-lg hover:bg-white border-gray-200"
          onClick={resetView}
          title="Reset to Indonesia"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-red-500 text-white backdrop-blur-sm shadow-lg hover:bg-red-600 border-red-400"
          onClick={focusJava}
          title="Focus Java"
        >
          <MapPin className="w-4 h-4" />
        </Button>
      </div>

      {/* Enhanced Layer Info */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg px-4 py-3 text-sm font-medium shadow-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" />
          <span className="text-gray-700">
            {selectedLayer === "landcover" && "🌿 Tutupan Lahan Indonesia"}
            {selectedLayer === "satellite" && "🛰️ Citra Satelit Indonesia"}
            {selectedLayer === "terrain" && "🏔️ Topografi Indonesia"}
            {selectedLayer === "ndvi" && "🌱 Indeks Vegetasi Indonesia"}
            {selectedLayer === "temperature" && "🌡️ Suhu Permukaan Indonesia"}
            {selectedLayer === "fires" && "🔥 Titik Api Indonesia"}
          </span>
        </div>
      </div>

      {/* Enhanced Coordinates Display */}
      {clickedCoords && (
        <div className="absolute top-20 right-4 z-[1000] bg-red-500 text-white rounded-lg px-4 py-3 text-sm shadow-lg border border-red-400">
          <div className="font-medium flex items-center gap-2">
            <span>📍</span>
            <span>Lokasi Indonesia</span>
          </div>
          <div className="text-xs opacity-90 mt-1 font-mono">
            {clickedCoords.lat.toFixed(6)}°, {clickedCoords.lng.toFixed(6)}°
          </div>
        </div>
      )}

      {/* Enhanced Zoom Level */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 text-sm shadow-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Zoom:</span>
          <span className="font-bold text-gray-700">{currentZoom}</span>
        </div>
      </div>

      {/* Enhanced Fire Count */}
      {selectedLayer === "fires" && fireData.length > 0 && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-red-500 text-white rounded-lg px-4 py-3 text-sm shadow-lg border border-red-400">
          <div className="flex items-center gap-2">
            <span className="animate-pulse text-lg">🔥</span>
            <div>
              <div className="font-bold">{fireData.length} Titik Api Indonesia</div>
              <div className="text-xs opacity-90">Klik marker untuk detail</div>
            </div>
          </div>
        </div>
      )}

      {/* Indonesia Region Info */}
      <div className="absolute bottom-16 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-600 shadow-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🇮🇩</span>
          <div>
            <div className="font-medium text-gray-700">Republik Indonesia</div>
            <div className="text-gray-500">17,508 Pulau • 1.9M km²</div>
          </div>
        </div>
      </div>

      {/* Enhanced Instructions */}
      <div className="absolute bottom-32 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-600 shadow-lg max-w-xs border border-gray-200">
        <div className="font-medium mb-1 text-gray-700">Kontrol Peta:</div>
        <div className="space-y-1">
          <div>🖱️ Klik untuk koordinat</div>
          <div>🔍 Scroll untuk zoom</div>
          <div>📍 Klik marker kota/api</div>
          <div>🗺️ Drag untuk geser peta</div>
          <div>🔴 Tombol merah fokus Jawa</div>
        </div>
      </div>

      {/* Attribution */}
      <div className="absolute bottom-1 right-1 z-[1000] bg-white/80 px-2 py-1 text-xs text-gray-600 rounded">
        © OpenStreetMap contributors
      </div>
    </div>
  )
}
