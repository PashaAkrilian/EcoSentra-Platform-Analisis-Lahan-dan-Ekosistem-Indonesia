"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, Send, X, Bot, User, Sparkles, Leaf, Map, BarChart3, Minimize2 } from "lucide-react"

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: Date
}

// --- AI Response Configuration ---
const responseMap: Record<string, string> = {
  "hutan|forest":
    "🌲 Berdasarkan data terbaru, Indonesia memiliki sekitar 920,000 km² hutan primer dan 340,000 km² hutan sekunder. Upaya konservasi terus dilakukan melalui program restorasi dan monitoring satelit real-time.",
  "deforestasi|penebangan":
    "🪓 Penyebab utama deforestasi di Indonesia meliputi konversi lahan untuk kelapa sawit, pertanian skala besar, penebangan ilegal, dan pembangunan infrastruktur. Monitoring satelit membantu deteksi dini.",
  "api|kebakaran|fire":
    "🔥 Sistem monitoring titik api menggunakan data NASA FIRMS (VIIRS & MODIS). Deteksi real-time setiap 6 jam dengan confidence 70-95%, terutama di Sumatra dan Kalimantan.",
  "ndvi|vegetasi":
    "🌱 NDVI (Normalized Difference Vegetation Index) mengukur kesehatan vegetasi (-1 hingga +1). Nilai tinggi (0.6-0.9) berarti vegetasi sehat. Rata-rata NDVI hutan Indonesia adalah 0.7.",
  "satelit|citra":
    "🛰️ Kami menggunakan berbagai satelit seperti Sentinel-2 (10m resolusi), Landsat-8 (30m), dan MODIS (250m-1km) untuk monitoring perubahan tutupan lahan harian.",
  "lahan|tutupan":
    "🗺️ Tutupan lahan Indonesia terdiri dari hutan primer (48.2%), hutan sekunder (17.8%), pertanian (19.9%), perairan (6.3%), perkotaan (4.5%), dan padang rumput (3.4%).",
  "ekspor|download":
    "💾 Anda dapat mengekspor data dalam format GeoTIFF, Shapefile, GeoJSON, KML, atau CSV. Pilih layer, tanggal, dan format yang diinginkan di panel kontrol.",
  "default":
    "🤖 Terima kasih! Saya dapat membantu dengan info tutupan lahan, monitoring hutan, titik api, NDVI, dan data satelit. Silakan ajukan pertanyaan spesifik atau pilih dari contoh di atas.",
};

const generateAIResponse = (question: string): string => {
  const lowerQuestion = question.toLowerCase();
  for (const keywords in responseMap) {
    if (keywords !== "default" && keywords.split("|").some(keyword => lowerQuestion.includes(keyword))) {
      return responseMap[keywords];
    }
  }
  return responseMap["default"];
};


// --- Component ---
export function AskLandAI() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        "Halo! Saya LandAI, asisten AI untuk analisis tutupan lahan dan ekosistem Indonesia. Bagaimana saya bisa membantu Anda hari ini?",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const quickQuestions = [
    "Bagaimana kondisi hutan Indonesia saat ini?",
    "Apa penyebab utama deforestasi?",
    "Bagaimana cara monitoring titik api?",
    "Jelaskan tentang NDVI Indonesia",
  ]

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    setTimeout(() => {
      const aiResponse = generateAIResponse(inputValue)
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: aiResponse,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleQuickQuestion = (question: string) => {
    setInputValue(question)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 h-12 w-12 lg:h-14 lg:w-14 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-2xl z-50 transition-all duration-300 hover:scale-110"
        size="icon"
      >
        <div className="relative">
          <MessageCircle className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
        </div>
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 w-[calc(100vw-2rem)] max-w-sm lg:w-96 h-[70vh] lg:h-[600px] shadow-2xl z-50 bg-white/95 backdrop-blur-sm border border-emerald-200">
      <CardHeader className="pb-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Sparkles className="h-4 w-4 lg:h-5 lg:w-5" />
            </div>
            <div>
              <CardTitle className="text-base lg:text-lg">LandAI Assistant</CardTitle>
              <p className="text-xs text-emerald-100">AI untuk Analisis Lahan Indonesia</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 text-white hover:bg-white/20 lg:hidden"
              title="Minimize"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 text-white hover:bg-white/20 hidden lg:flex"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex flex-col h-[calc(70vh-80px)] lg:h-[calc(600px-80px)]">
        <div className="p-3 lg:p-4 border-b bg-gray-50/50">
          <p className="text-xs text-gray-600 mb-2">Pertanyaan Cepat:</p>
          <div className="flex flex-wrap gap-1">
            {quickQuestions.slice(0, 2).map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-6 lg:h-7 bg-white hover:bg-emerald-50 hover:border-emerald-300 px-2"
                onClick={() => handleQuickQuestion(question)}
              >
                {question.length > 20 ? question.substring(0, 20) + "..." : question}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 p-3 lg:p-4">
          <div className="space-y-3 lg:space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 lg:gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.type === "ai" && (
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                      <Bot className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                    </div>
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-2 lg:p-3 rounded-lg text-sm ${
                    message.type === "user"
                      ? "bg-emerald-500 text-white rounded-br-none"
                      : "bg-gray-100 text-gray-800 rounded-bl-none"
                  }`}
                >
                  {message.content}
                  <div
                    className={`text-xs mt-1 opacity-70 ${
                      message.type === "user" ? "text-emerald-100" : "text-gray-500"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                {message.type === "user" && (
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 lg:w-4 lg:h-4 text-gray-600" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2 lg:gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <Bot className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                  </div>
                </div>
                <div className="bg-gray-100 p-2 lg:p-3 rounded-lg rounded-bl-none">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-3 lg:p-4 border-t bg-white">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Tanya tentang lahan Indonesia..."
              className="flex-1 text-sm"
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <Button
              onClick={handleSendMessage}
              size="icon"
              className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 w-9 lg:h-10 lg:w-10"
              disabled={!inputValue.trim() || isTyping}
            >
              <Send className="h-3 w-3 lg:h-4 lg:w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3 lg:gap-4 mt-2">
            <div className="flex items-center gap-1">
              <Leaf className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-gray-500">Hutan</span>
            </div>
            <div className="flex items-center gap-1">
              <Map className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-gray-500">Peta</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3 text-purple-500" />
              <span className="text-xs text-gray-500">Analisis</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
