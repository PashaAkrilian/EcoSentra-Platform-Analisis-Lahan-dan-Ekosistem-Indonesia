"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth"
import { getClientAuth, isFirebaseClientConfigured } from "@/lib/firebaseClient"

interface AuthContextValue {
  /** false = env Firebase client belum diisi -> mode demo tanpa login. */
  configured: boolean
  user: User | null
  /** true sampai status login awal diketahui. */
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
  /** ID token untuk header Authorization ke API routes, atau null kalau belum login. */
  getIdToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function requireAuth() {
  const auth = getClientAuth()
  if (!auth) throw new Error("Login belum dikonfigurasi (Firebase client env kosong).")
  return auth
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isFirebaseClientConfigured)

  useEffect(() => {
    const auth = getClientAuth()
    if (!auth) return
    return onAuthStateChanged(auth, (next) => {
      setUser(next)
      setLoading(false)
    })
  }, [])

  const getIdToken = useCallback(async () => {
    const current = getClientAuth()?.currentUser
    return current ? current.getIdToken() : null
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isFirebaseClientConfigured,
      user,
      loading,
      getIdToken,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(requireAuth(), email, password)
      },
      signUp: async (name, email, password) => {
        const credential = await createUserWithEmailAndPassword(requireAuth(), email, password)
        if (name) await updateProfile(credential.user, { displayName: name })
      },
      signInWithGoogle: async () => {
        await signInWithPopup(requireAuth(), new GoogleAuthProvider())
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(requireAuth(), email)
      },
      signOut: async () => {
        await firebaseSignOut(requireAuth())
      },
    }),
    [user, loading, getIdToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth harus dipakai di dalam <AuthProvider>.")
  return context
}

/** Pesan error Firebase Auth yang ramah pengguna (Bahasa Indonesia). */
export function describeAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? ""
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Email atau kata sandi salah.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/user-not-found": "Akun dengan email ini tidak ditemukan.",
    "auth/wrong-password": "Email atau kata sandi salah.",
    "auth/email-already-in-use": "Email ini sudah terdaftar. Silakan masuk.",
    "auth/weak-password": "Kata sandi minimal 6 karakter.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.",
    "auth/popup-closed-by-user": "Jendela login ditutup sebelum selesai.",
    "auth/network-request-failed": "Gagal terhubung ke server login. Periksa koneksi internet.",
  }
  return messages[code] ?? (error instanceof Error ? error.message : "Terjadi kesalahan saat login.")
}
