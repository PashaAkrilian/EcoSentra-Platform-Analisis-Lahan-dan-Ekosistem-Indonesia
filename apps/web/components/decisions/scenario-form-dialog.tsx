"use client"

import { useEffect, useState } from "react"
import { LoaderCircle } from "lucide-react"
import { LocationField } from "@/components/forms/location-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuthedFetch } from "@/hooks/use-api"
import { useFormErrors } from "@/hooks/use-form-errors"
import { errorMessage } from "@/lib/api-client"
import type { LatLng, Scenario } from "@/lib/data/types"
import { zodFieldErrors } from "@/lib/form"
import { SCENARIO_CATEGORIES, SCENARIO_PRIORITIES, SCENARIO_STATUSES, scenarioInputSchema } from "@/lib/schemas"

export const CATEGORY_LABELS: Record<Scenario["category"], string> = {
  pertanian: "Pertanian",
  kehutanan: "Kehutanan",
  kebencanaan: "Kebencanaan",
  konservasi: "Konservasi",
}
export const STATUS_LABELS: Record<Scenario["status"], string> = { draf: "Draf", berjalan: "Berjalan", selesai: "Selesai" }
export const PRIORITY_LABELS: Record<Scenario["priority"], string> = { rendah: "Rendah", sedang: "Sedang", tinggi: "Tinggi" }

interface FormState {
  title: string
  description: string
  category: Scenario["category"] | ""
  status: Scenario["status"]
  priority: Scenario["priority"]
  deadline: string
}

const EMPTY: FormState = { title: "", description: "", category: "", status: "draf", priority: "sedang", deadline: "" }

/** Dialog tambah/ubah skenario. Lokasi opsional — kalau diisi, halaman detail menampilkan konteks data langsung. */
export function ScenarioFormDialog({
  open,
  onOpenChange,
  scenario,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  scenario?: Scenario | null
  onSaved: (scenario: Scenario) => void
}) {
  const authedFetch = useAuthedFetch()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [withLocation, setWithLocation] = useState(false)
  const [location, setLocation] = useState<LatLng | null>(null)
  const { errors, setErrors, clear } = useFormErrors()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setSubmitError(null)
    if (scenario) {
      setForm({
        title: scenario.title,
        description: scenario.description,
        category: scenario.category,
        status: scenario.status,
        priority: scenario.priority,
        deadline: scenario.deadline ?? "",
      })
      setLocation(scenario.location)
      setWithLocation(scenario.location !== null)
    } else {
      setForm(EMPTY)
      setLocation(null)
      setWithLocation(false)
    }
  }, [open, scenario, setErrors])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    clear(key)
  }
  const changeLocation = (next: LatLng | null) => {
    setLocation(next)
    clear("location", "location.lat", "location.lng")
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = scenarioInputSchema.safeParse({
      title: form.title,
      description: form.description,
      category: form.category || undefined,
      status: form.status,
      priority: form.priority,
      deadline: form.deadline || null,
      location: withLocation ? (location ?? undefined) : null,
    })
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error))
      return
    }
    setErrors({})
    setSaving(true)
    setSubmitError(null)
    try {
      const saved = scenario
        ? await authedFetch<Scenario>(`/api/decisions/${scenario.id}`, { method: "PATCH", body: parsed.data })
        : await authedFetch<Scenario>("/api/decisions", { method: "POST", body: parsed.data })
      onSaved(saved)
      onOpenChange(false)
    } catch (error) {
      setSubmitError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{scenario ? "Ubah skenario" : "Buat skenario"}</DialogTitle>
          <DialogDescription>Catat rencana atau keputusan pengelolaan lahan beserta lokasi dan tenggatnya.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="sc-title">Judul</Label>
            <Input id="sc-title" value={form.title} onChange={(e) => set("title", e.target.value)} aria-invalid={Boolean(errors.title)} placeholder="mis. Pencegahan karhutla musim kemarau" />
            {errors.title && <p className="mt-1 text-xs text-red-700">{errors.title}</p>}
          </div>
          <div>
            <Label htmlFor="sc-desc">Deskripsi</Label>
            <Textarea id="sc-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="sc-category">Kategori</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v as Scenario["category"])}>
                <SelectTrigger id="sc-category" aria-invalid={Boolean(errors.category)}>
                  <SelectValue placeholder="Pilih" />
                </SelectTrigger>
                <SelectContent>
                  {SCENARIO_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="mt-1 text-xs text-red-700">Pilih kategori</p>}
            </div>
            <div>
              <Label htmlFor="sc-status">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as Scenario["status"])}>
                <SelectTrigger id="sc-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCENARIO_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sc-priority">Prioritas</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v as Scenario["priority"])}>
                <SelectTrigger id="sc-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCENARIO_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="sc-deadline">Tenggat (opsional)</Label>
            <Input id="sc-deadline" type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
          </div>
          <div className="rounded-lg border p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={withLocation} onChange={(e) => setWithLocation(e.target.checked)} />
              Tambahkan lokasi (untuk konteks data langsung & rekomendasi)
            </label>
            {withLocation && (
              <div className="mt-3">
                <LocationField
                  idPrefix="sc-loc"
                  value={location}
                  onChange={changeLocation}
                  errors={{ lat: errors["location.lat"], lng: errors["location.lng"], _form: errors.location }}
                />
              </div>
            )}
          </div>
          {submitError && (
            <p role="alert" className="text-sm text-red-700">
              {submitError}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <LoaderCircle className="animate-spin" aria-hidden />}
              {scenario ? "Simpan perubahan" : "Buat skenario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
