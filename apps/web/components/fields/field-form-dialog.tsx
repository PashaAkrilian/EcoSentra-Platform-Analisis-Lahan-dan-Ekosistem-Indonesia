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
import { errorMessage } from "@/lib/api-client"
import type { Field, LatLng } from "@/lib/data/types"
import { zodFieldErrors } from "@/lib/form"
import { CROP_TYPES, fieldInputSchema } from "@/lib/schemas"

interface FormState {
  name: string
  cropType: string
  areaHa: string
  plantingDate: string
  notes: string
}

const EMPTY: FormState = { name: "", cropType: "", areaHa: "", plantingDate: "", notes: "" }

/** Dialog tambah/ubah lahan. `field` terisi = mode ubah; `prefill` mengisi lokasi awal (mis. dari peta). */
export function FieldFormDialog({
  open,
  onOpenChange,
  field,
  prefill,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  field?: Field | null
  prefill?: LatLng | null
  onSaved: (field: Field) => void
}) {
  const authedFetch = useAuthedFetch()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [location, setLocation] = useState<LatLng | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setSubmitError(null)
    if (field) {
      setForm({
        name: field.name,
        cropType: field.cropType,
        areaHa: String(field.areaHa),
        plantingDate: field.plantingDate ?? "",
        notes: field.notes,
      })
      setLocation(field.location)
    } else {
      setForm(EMPTY)
      setLocation(prefill ?? null)
    }
  }, [open, field, prefill])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = fieldInputSchema.safeParse({
      name: form.name,
      cropType: form.cropType,
      areaHa: form.areaHa.trim() === "" ? undefined : form.areaHa.replace(",", "."),
      plantingDate: form.plantingDate || null,
      notes: form.notes,
      location: location ?? undefined,
    })
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error))
      return
    }
    setErrors({})
    setSaving(true)
    setSubmitError(null)
    try {
      const saved = field
        ? await authedFetch<Field>(`/api/fields/${field.id}`, { method: "PATCH", body: parsed.data })
        : await authedFetch<Field>("/api/fields", { method: "POST", body: parsed.data })
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
          <DialogTitle>{field ? "Ubah lahan" : "Tambah lahan"}</DialogTitle>
          <DialogDescription>
            Lokasi dipakai untuk menganalisis tutupan lahan, NDVI, cuaca, dan titik api di sekitarnya.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="field-name">Nama lahan</Label>
            <Input id="field-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="mis. Sawah Subang Blok A" aria-invalid={Boolean(errors.name)} />
            {errors.name && <p className="mt-1 text-xs text-red-700">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="field-crop">Jenis tanaman</Label>
              <Select value={form.cropType} onValueChange={(v) => set("cropType", v)}>
                <SelectTrigger id="field-crop" aria-invalid={Boolean(errors.cropType)}>
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  {CROP_TYPES.map((crop) => (
                    <SelectItem key={crop} value={crop}>
                      {crop}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cropType && <p className="mt-1 text-xs text-red-700">{errors.cropType}</p>}
            </div>
            <div>
              <Label htmlFor="field-area">Luas (hektare)</Label>
              <Input id="field-area" inputMode="decimal" value={form.areaHa} onChange={(e) => set("areaHa", e.target.value)} placeholder="2,5" aria-invalid={Boolean(errors.areaHa)} />
              {errors.areaHa && <p className="mt-1 text-xs text-red-700">{errors.areaHa}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="field-planting">Tanggal tanam (opsional)</Label>
            <Input id="field-planting" type="date" value={form.plantingDate} onChange={(e) => set("plantingDate", e.target.value)} />
            {errors.plantingDate && <p className="mt-1 text-xs text-red-700">{errors.plantingDate}</p>}
          </div>
          <LocationField
            idPrefix="field-loc"
            value={location}
            onChange={setLocation}
            errors={{ lat: errors["location.lat"], lng: errors["location.lng"], _form: errors.location }}
          />
          <div>
            <Label htmlFor="field-notes">Catatan (opsional)</Label>
            <Textarea id="field-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
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
              {field ? "Simpan perubahan" : "Tambah lahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
