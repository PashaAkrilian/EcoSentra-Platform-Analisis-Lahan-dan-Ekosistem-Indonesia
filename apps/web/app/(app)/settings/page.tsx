"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CircleCheck, CircleMinus, LoaderCircle, LogOut, Trash2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageContainer, PageHeader } from "@/components/page-header"
import { RequireAuth } from "@/components/require-auth"
import { ErrorState, LoadingLines } from "@/components/status"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApi, useAuthedFetch } from "@/hooks/use-api"
import { errorMessage } from "@/lib/api-client"
import type { UserProfile } from "@/lib/data/types"
import { zodFieldErrors } from "@/lib/form"
import { profileInputSchema } from "@/lib/schemas"

interface Health {
  status: string
  integrations: { firebaseAdmin: boolean; firebaseAuthClient: boolean; geoService: boolean; llm: boolean }
}

const INTEGRATIONS: { key: keyof Health["integrations"]; title: string; on: string; off: string }[] = [
  {
    key: "firebaseAuthClient",
    title: "Login (Firebase Auth)",
    on: "Pengunjung dapat mendaftar dan masuk.",
    off: "Mode demo: tanpa login. Isi NEXT_PUBLIC_FIREBASE_* untuk mengaktifkan.",
  },
  {
    key: "firebaseAdmin",
    title: "Penyimpanan data (Firestore)",
    on: "Lahan, riwayat analisis, skenario, dan peringatan admin tersimpan.",
    off: "Data pribadi tidak disimpan. Isi FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.",
  },
  {
    key: "geoService",
    title: "Layanan geo (Google Earth Engine)",
    on: "Analisis tutupan lahan memakai ESA WorldCover via services/geo, dengan cadangan Esri.",
    off: "Analisis tutupan lahan memakai Esri/Impact Observatory 10 m (tanpa kredensial).",
  },
  {
    key: "llm",
    title: "LandAI (model bahasa Claude)",
    on: "Asisten menjawab bebas memakai data langsung sebagai alat bantu.",
    off: "LandAI memakai mode berbasis aturan (tetap memakai data asli untuk pertanyaan umum).",
  },
]

function ProfileForm() {
  const { user, signOut } = useAuth()
  const authedFetch = useAuthedFetch()
  const profile = useApi<UserProfile>("/api/profile", { auth: true })
  const [displayName, setDisplayName] = useState("")
  const [organization, setOrganization] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (profile.data) {
      setDisplayName(profile.data.displayName)
      setOrganization(profile.data.organization)
    }
  }, [profile.data])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = profileInputSchema.safeParse({ displayName, organization })
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error))
      return
    }
    setErrors({})
    setSaving(true)
    setMessage(null)
    try {
      const saved = await authedFetch<UserProfile>("/api/profile", { method: "PUT", body: parsed.data })
      profile.setData(() => saved)
      setMessage({ kind: "ok", text: "Profil disimpan." })
    } catch (error) {
      setMessage({ kind: "error", text: errorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const deleteAccount = async () => {
    await authedFetch("/api/profile", { method: "DELETE" })
    await signOut().catch(() => undefined) // akun sudah terhapus di server; sesi lokal dibersihkan
  }

  if (profile.isLoading) return <LoadingLines rows={3} />
  if (profile.error) return <ErrorState message={profile.error} onRetry={profile.reload} />

  return (
    <>
      <form onSubmit={save} className="max-w-md space-y-4" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email ?? ""} readOnly disabled />
        </div>
        <div>
          <Label htmlFor="displayName">Nama</Label>
          <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} aria-invalid={Boolean(errors.displayName)} />
          {errors.displayName && <p className="mt-1 text-xs text-red-700">{errors.displayName}</p>}
        </div>
        <div>
          <Label htmlFor="organization">Organisasi (opsional)</Label>
          <Input id="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} />
        </div>
        {profile.data?.isAdmin && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Akun ini memiliki peran <strong>admin</strong> (dapat menerbitkan peringatan kurasi).</p>
        )}
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={`text-sm ${message.kind === "error" ? "text-red-700" : "text-emerald-800"}`}>
            {message.text}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving && <LoaderCircle className="animate-spin" aria-hidden />} Simpan
          </Button>
          <Button type="button" variant="outline" onClick={() => signOut()}>
            <LogOut aria-hidden /> Keluar
          </Button>
        </div>
      </form>

      <div className="mt-8 max-w-md rounded-lg border border-red-200 bg-red-50/50 p-4">
        <h3 className="text-sm font-semibold text-red-900">Hapus akun dan data</h3>
        <p className="mt-1 text-sm text-red-900/80">
          Menghapus permanen akun login beserta semua lahan, riwayat analisis, dan skenario Anda. Tidak dapat dibatalkan.
        </p>
        <Button variant="destructive" className="mt-3" onClick={() => setConfirmDelete(true)}>
          <Trash2 aria-hidden /> Hapus akun saya
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Hapus akun dan semua data?"
        description="Semua lahan, riwayat analisis, dan skenario Anda akan dihapus permanen bersama akun login. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, hapus semuanya"
        onConfirm={deleteAccount}
      />
    </>
  )
}

export default function SettingsPage() {
  const health = useApi<Health>("/api/healthcheck")

  return (
    <PageContainer>
      <PageHeader title="Pengaturan" description="Akun Anda dan status integrasi instalasi ini." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Akun</CardTitle>
            <CardDescription>Profil dan penghapusan data.</CardDescription>
          </CardHeader>
          <CardContent>
            <RequireAuth feature="Pengaturan akun">
              <ProfileForm />
            </RequireAuth>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status integrasi</CardTitle>
            <CardDescription>
              Fitur opsional yang aktif di instalasi ini. Cara mengaktifkannya ada di{" "}
              <Link href="/help#mode-demo" className="font-medium text-emerald-800 underline underline-offset-2">
                Bantuan
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            {health.isLoading ? (
              <LoadingLines rows={4} />
            ) : health.error ? (
              <ErrorState message={health.error} onRetry={health.reload} />
            ) : (
              <ul className="divide-y">
                {INTEGRATIONS.map((item) => {
                  const active = health.data?.integrations[item.key] ?? false
                  const Icon = active ? CircleCheck : CircleMinus
                  return (
                    <li key={item.key} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${active ? "text-emerald-700" : "text-muted-foreground"}`} aria-hidden />
                      <div>
                        <p className="text-sm font-medium">
                          {item.title}{" "}
                          <span className={`text-xs font-semibold ${active ? "text-emerald-800" : "text-muted-foreground"}`}>
                            {active ? "Aktif" : "Tidak aktif"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{active ? item.on : item.off}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
