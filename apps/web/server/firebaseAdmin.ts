// server/firebaseAdmin.ts
import "server-only"
import { cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore"

/**
 * Dilempar kalau route butuh Firestore/Auth tapi kredensial Firebase belum
 * di-set. Route handler memetakannya ke HTTP 503 (lihat server/http.ts),
 * jadi aplikasi tetap bisa start & build tanpa kredensial — fitur yang
 * memakai data publik (FIRMS, BMKG, dst.) tetap jalan.
 */
export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super("Firebase belum dikonfigurasi di server (lihat apps/web/.env.local.example).")
    this.name = "FirebaseNotConfiguredError"
  }
}

function hasServiceAccountEnv(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY,
  )
}

function usesEmulator(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST),
  )
}

/**
 * Firebase App Hosting meng-inject FIREBASE_CONFIG dan menyediakan
 * Application Default Credentials, jadi di sana tidak perlu private key.
 */
function usesApplicationDefaultCredentials(): boolean {
  return Boolean(process.env.FIREBASE_CONFIG)
}

export function isFirebaseAdminConfigured(): boolean {
  return hasServiceAccountEnv() || usesEmulator() || usesApplicationDefaultCredentials()
}

function getAdminApp(): App {
  const existing = getApps()[0]
  if (existing) return existing

  if (!isFirebaseAdminConfigured()) {
    throw new FirebaseNotConfiguredError()
  }

  try {
    if (hasServiceAccountEnv()) {
      return initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
        }),
      })
    }
    if (usesEmulator()) {
      return initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID })
    }
    return initializeApp()
  } catch (error) {
    // Hanya log pesan error, bukan objek error SDK penuh — objek itu bisa
    // memuat potongan kredensial (temuan #3 di docs/security-checklist.md).
    console.error("Firebase Admin gagal diinisialisasi:", error instanceof Error ? error.message : "unknown error")
    throw new Error("Failed to initialize Firebase Admin SDK.")
  }
}

export function getDb(): Firestore {
  return getFirestore(getAdminApp())
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp())
}

export { FieldValue }
