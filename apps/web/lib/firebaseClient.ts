// lib/firebaseClient.ts
import { getApp, getApps, initializeApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"

// Di browser Firebase hanya dipakai untuk Auth (login). Firestore diakses
// lewat API routes (lihat firestore.rules), jadi SDK Firestore client tidak
// ikut di-bundle. Nilai NEXT_PUBLIC_* di-inline saat build, jadi harus
// ditulis literal seperti di bawah.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const isFirebaseClientConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId,
)

/** Instance Firebase Auth, atau `null` kalau env Firebase client belum diisi (mode demo). */
export function getClientAuth(): Auth | null {
  if (!isFirebaseClientConfigured) return null
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  return getAuth(app)
}
