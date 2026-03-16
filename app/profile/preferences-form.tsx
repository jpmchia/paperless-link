"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Save } from "lucide-react"

const DATE_LOCALE_OPTIONS = [
  { value: "", label: "Browser default" },
  { value: "en-US", label: "English (US) — MM/DD/YYYY" },
  { value: "en-GB", label: "English (UK) — DD/MM/YYYY" },
  { value: "de-DE", label: "German — DD.MM.YYYY" },
  { value: "fr-FR", label: "French — DD/MM/YYYY" },
  { value: "es-ES", label: "Spanish — DD/MM/YYYY" },
  { value: "it-IT", label: "Italian — DD/MM/YYYY" },
  { value: "nl-NL", label: "Dutch — D-M-YYYY" },
  { value: "pl-PL", label: "Polish — DD.MM.YYYY" },
  { value: "pt-PT", label: "Portuguese — DD/MM/YYYY" },
  { value: "sv-SE", label: "Swedish — YYYY-MM-DD" },
  { value: "ja-JP", label: "Japanese — YYYY/MM/DD" },
  { value: "zh-CN", label: "Chinese — YYYY/MM/DD" },
]

const DEFAULT_PAGESIZE_OPTIONS = [
  { value: "10", label: "10 documents" },
  { value: "25", label: "25 documents" },
  { value: "50", label: "50 documents" },
  { value: "100", label: "100 documents" },
]

export function PreferencesForm({ initialSettings }: { initialSettings: any }) {
  const settings: any = initialSettings?.settings ?? {}

  const [dateLocale, setDateLocale] = React.useState<string>(settings.date_locale ?? "")
  const [defaultPageSize, setDefaultPageSize] = React.useState<string>(
    String(settings.default_page_size ?? 25)
  )
  const [notifyNewDoc, setNotifyNewDoc] = React.useState<boolean>(
    settings.notifications_consumer_new_document ?? false
  )
  const [notifyDocAdded, setNotifyDocAdded] = React.useState<boolean>(
    settings.notifications_document_added ?? false
  )
  const [notifyDocUpdated, setNotifyDocUpdated] = React.useState<boolean>(
    settings.notifications_document_updated ?? false
  )
  const [saving, setSaving] = React.useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // Merge new preferences with existing settings to avoid overwriting other keys
      const getRes = await fetch("/api/proxy/ui_settings/", { method: "GET" })
      if (!getRes.ok) throw new Error("Failed to load current settings")
      const current = await getRes.json()
      const merged = {
        ...(current.settings ?? {}),
        date_locale: dateLocale,
        default_page_size: Number(defaultPageSize),
        notifications_consumer_new_document: notifyNewDoc,
        notifications_document_added: notifyDocAdded,
        notifications_document_updated: notifyDocUpdated,
      }
      const patchRes = await fetch("/api/proxy/ui_settings/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: merged }),
      })
      if (!patchRes.ok) throw new Error(`${patchRes.status}: ${patchRes.statusText}`)
      toast.success("Preferences saved")
    } catch (e: any) {
      toast.error("Failed to save preferences", { description: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 max-w-lg">
      {/* Display */}
      <div>
        <h3 className="text-lg font-medium">Display</h3>
        <p className="text-sm text-muted-foreground">Appearance and formatting preferences.</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label>Date format</Label>
          <Select value={dateLocale} onValueChange={setDateLocale}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Browser default" />
            </SelectTrigger>
            <SelectContent>
              {DATE_LOCALE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Controls how dates are displayed throughout the application.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Default page size</Label>
          <Select value={defaultPageSize} onValueChange={setDefaultPageSize}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_PAGESIZE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Default number of documents shown per page in the document list.
          </p>
        </div>
      </div>

      <Separator />

      {/* Notifications */}
      <div>
        <h3 className="text-lg font-medium">Notifications</h3>
        <p className="text-sm text-muted-foreground">Control which events trigger notifications.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">New document consumed</p>
            <p className="text-xs text-muted-foreground">Notify when the consumer ingests a new document.</p>
          </div>
          <Switch
            checked={notifyNewDoc}
            onCheckedChange={setNotifyNewDoc}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Document added</p>
            <p className="text-xs text-muted-foreground">Notify when a document is added to the system.</p>
          </div>
          <Switch
            checked={notifyDocAdded}
            onCheckedChange={setNotifyDocAdded}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Document updated</p>
            <p className="text-xs text-muted-foreground">Notify when a document's metadata is updated.</p>
          </div>
          <Switch
            checked={notifyDocUpdated}
            onCheckedChange={setNotifyDocUpdated}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </div>
  )
}
