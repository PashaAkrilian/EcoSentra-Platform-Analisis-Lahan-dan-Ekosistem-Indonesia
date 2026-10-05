"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Leaf, LoaderCircle, MailCheck } from "lucide-react"
import { describeAuthError, useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { safeNextPath } from "@/lib/redirect"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  )
}

function LoginContent() {
  const { configured, user, loading, signIn, signUp, signInWithGoogle, resetPassword } = useAuth()
  const router = useRouter()
  const next = safeNextPath(useSearchParams().get("next"))

  const [tab, setTab] = useState("masuk")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) router.replace(next)
  }, [loading, user, next, router])

  const run = async (action: () => Promise<void>, success?: string) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      if (success) setNotice(success)
    } catch (e) {
      setError(describeAuthError(e))
    } finally {
      setBusy(false)
    }
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (tab === "masuk") void run(() => signIn(email.trim(), password))
    else void run(() => signUp(name.trim(), email.trim(), password))
  }

  const forgot = () => {
    if (!email.trim()) {
      setError("Isi email Anda terlebih dahulu, lalu tekan “Lupa kata sandi”.")
      return
    }
    void run(() => resetPassword(email.trim()), "Jika email terdaftar, tautan untuk mengatur ulang kata sandi sudah dikirim.")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke beranda
        </Link>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-xl bg-emerald-700 p-2.5">
              <Leaf className="h-6 w-6 text-white" aria-hidden />
            </div>
            <CardTitle className="text-2xl">EcoSentra</CardTitle>
            <CardDescription>Masuk untuk menyimpan lahan dan skenario Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            {!configured ? (
              <div role="status" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Login belum dikonfigurasi</p>
                <p className="mt-1">
                  Instalasi ini berjalan dalam mode demo. Semua data publik tetap bisa dipakai tanpa akun.{" "}
                  <Link href="/help#mode-demo" className="font-medium underline underline-offset-2">
                    Cara mengaktifkan login
                  </Link>
                  .
                </p>
                <Button asChild className="mt-3">
                  <Link href="/dashboard">Lanjut tanpa akun</Link>
                </Button>
              </div>
            ) : (
              <Tabs value={tab} onValueChange={(v) => { setTab(v); setError(null); setNotice(null) }}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="masuk">Masuk</TabsTrigger>
                  <TabsTrigger value="daftar">Daftar</TabsTrigger>
                </TabsList>

                <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
                  <TabsContent value="daftar" className="mt-0">
                    <Label htmlFor="name">Nama</Label>
                    <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                  </TabsContent>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="password">Kata sandi</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={tab === "masuk" ? "current-password" : "new-password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    {tab === "daftar" && <p className="mt-1 text-xs text-muted-foreground">Minimal 6 karakter.</p>}
                  </div>

                  {error && (
                    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                      {error}
                    </p>
                  )}
                  {notice && (
                    <p role="status" className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                      <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {notice}
                    </p>
                  )}

                  <Button type="submit" className="w-full" disabled={busy || !email || !password}>
                    {busy && <LoaderCircle className="animate-spin" aria-hidden />}
                    {tab === "masuk" ? "Masuk" : "Buat akun"}
                  </Button>
                  {tab === "masuk" && (
                    <button type="button" onClick={forgot} className="block w-full text-center text-sm text-emerald-800 underline underline-offset-2" disabled={busy}>
                      Lupa kata sandi?
                    </button>
                  )}
                </form>

                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> atau <span className="h-px flex-1 bg-border" />
                </div>
                <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void run(signInWithGoogle)}>
                  <GoogleIcon /> Lanjut dengan Google
                </Button>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
