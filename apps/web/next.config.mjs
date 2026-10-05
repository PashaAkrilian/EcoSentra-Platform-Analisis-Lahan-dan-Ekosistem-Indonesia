const isDev = process.env.NODE_ENV !== "production"

// Content-Security-Policy: halaman ini memuat tile peta dari banyak server
// (Esri, OpenStreetMap, OpenTopoMap, NASA GIBS) -> img-src mengizinkan https:.
// Firebase Auth butuh googleapis (REST) & iframe di *.firebaseapp.com untuk
// login Google. 'unsafe-inline' pada script dibutuhkan skrip hidrasi Next.js
// tanpa nonce; 'unsafe-eval' hanya saat development (React Refresh).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://apis.google.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com",
  "frame-src https://*.firebaseapp.com https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ")

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async redirects() {
    // Halaman "Jasa Ekosistem" (data contoh) digantikan "Profil Ekosistem" berbasis data nyata.
    return [{ source: "/eco-services", destination: "/ecosystem", permanent: true }]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ]
  },
}

export default nextConfig
