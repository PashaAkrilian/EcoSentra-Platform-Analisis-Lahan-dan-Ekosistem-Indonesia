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
import type { Alert, LatLng } from "@/lib/data/types"
import { zodFieldErrors } from "@/lib/form"
import { ALERT_SEVERITIES, ALERT_TYPES, alertInputSchema } from "@/lib/schemas"

const TYPE_LABELS: Record<Alert["type"], string> = {
  kebakaran: "Kebakaran",
  banjir: "Banjir",
  kekeringan: "Kekeringan",
  longsor: "Tanah longsor",
  gempa: "Gempa bumi",
  lainnya: "Lainnya",
}

const SEVERITY_LABELS: Record<Alert["severity"], string> = { rendah: "Rendah", sedang: "Sedang", tinggi: "Tinggi", kritis: "Kritis" }

const EMPTY = {
  type: "banjir" as Alert["type"],
  severity: "sedang" as Alert["severity"],
  title: "",
  description: "",
  regionName: "",
}

/** Dialog admin untuk membuat peringatan kurasi baru. */
export function AlertFormDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (alert: Alert) => void
}) {
  const authedFetch = useAuthedFetch()
  const [form, setForm] = useState(EMPTY)
  const [location, setLocation] = useState<LatLng | null>(null)
  const { errors, setErrors, clear } = useFormErrors()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setLocation(null)
      setErrors({})
      setSubmitError(null)
    }
  }, [open, setErrors])

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    clear(key)
  }
  const changeLocation = (next: LatLng | null) => {
    setLocation(next)
    clear("location", "location.lat", "location.lng")
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = alertInputSchema.safeParse({ ...form, location: location ?? undefined })
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error))
      return
    }
    setErrors({})
    setSaving(true)
    setSubmitError(null)
    try {
      const alert = await authedFetch<Alert>("/api/alerts", { method: "POST", body: parsed.data })
      onSaved(alert)
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
          <DialogTitle>Buat peringatan</DialogTitle>
          <DialogDescription>
            Peringatan kurasi tampil untuk semua pengunjung bersama peringatan otomatis dari BMKG dan NASA FIRMS.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="alert-type">Jenis</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v as Alert["type"])}>
                <SelectTrigger id="alert-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="alert-severity">Tingkat keparahan</Label>
              <Select value={form.severity} onValueChange={(v) => set("severity", v as Alert["severity"])}>
                <SelectTrigger id="alert-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SEVERITY_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="alert-title">Judul</Label>
            <Input id="alert-title" value={form.title} onChange={(e) => set("title", e.target.value)} aria-invalid={Boolean(errors.title)} />
            {errors.title && <p className="mt-1 text-xs text-red-700">{errors.title}</p>}
          </div>
          <div>
            <Label htmlFor="alert-region">Wilayah</Label>
            <Input
              id="alert-region"
              placeholder="mis. Kab. Bandung, Jawa Barat"
              value={form.regionName}
              onChange={(e) => set("regionName", e.target.value)}
              aria-invalid={Boolean(errors.regionName)}
            />
            {errors.regionName && <p className="mt-1 text-xs text-red-700">{errors.regionName}</p>}
          </div>
          <div>
            <Label htmlFor="alert-description">Keterangan</Label>
            <Textarea id="alert-description" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
            {errors.description && <p className="mt-1 text-xs text-red-700">{errors.description}</p>}
          </div>
          <LocationField
            idPrefix="alert-loc"
            value={location}
            onChange={changeLocation}
            errors={{ lat: errors["location.lat"], lng: errors["location.lng"], _form: errors.location }}
          />
          {submitError && <p className="text-sm text-red-700">{submitError}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <LoaderCircle className="animate-spin" aria-hidden />}
              Terbitkan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
