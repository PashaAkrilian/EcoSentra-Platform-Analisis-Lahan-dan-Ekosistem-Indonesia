import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/components/auth-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: {
    default: "EcoSentra — Analisis Lahan & Ekosistem Indonesia",
    template: "%s · EcoSentra",
  },
  description:
    "Pemantauan titik api, gempa, tutupan lahan, dan kesehatan vegetasi Indonesia dari data satelit terbuka (NASA FIRMS, BMKG, MODIS, ESA/Esri Land Cover).",
}

export const viewport: Viewport = {
  themeColor: "#047857",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
