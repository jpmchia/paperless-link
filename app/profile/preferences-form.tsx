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
import { Save } from "lucide-react"
import { useSetAtom } from "jotai"
import { useAsyncAction } from "@/hooks/use-async-action"
import { mapNotificationPreferences } from "@/lib/notifications"
import { setNotificationPreferencesAtom } from "@/lib/stores/notifications"
import { updateUiSettings } from "@/app/actions/ui-settings"

const DATE_LOCALE_OPTIONS = [
  { value: "__browser_default__", label: "Browser default" },
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

interface PreferencesSettings {
  date_locale?: string
  default_page_size?: number
  notifications_consumer_new_document?: boolean
  notifications_consumer_success?: boolean
  notifications_consumer_failed?: boolean
  notifications_consumer_suppress_on_dashboard?: boolean
  notifications_document_added?: boolean
  notifications_document_updated?: boolean
}

export interface PreferencesFormProps {
  initialSettings?: {
    settings?: PreferencesSettings
  } | null
}

export function PreferencesForm({ initialSettings }: PreferencesFormProps) {
  const settings = initialSettings?.settings ?? {}
  const initialNotificationPreferences = mapNotificationPreferences(
    settings as Record<string, unknown>
  )

  const [dateLocale, setDateLocale] = React.useState<string>(settings.date_locale ?? "")
  const [defaultPageSize, setDefaultPageSize] = React.useState<string>(
    String(settings.default_page_size ?? 25)
  )
  const [notifyNewDoc, setNotifyNewDoc] = React.useState<boolean>(
    initialNotificationPreferences.consumerNewDocument
  )
  const [notifyConsumerSuccess, setNotifyConsumerSuccess] = React.useState<boolean>(
    initialNotificationPreferences.consumerSuccess
  )
  const [notifyConsumerFailed, setNotifyConsumerFailed] = React.useState<boolean>(
    initialNotificationPreferences.consumerFailed
  )
  const [notifyDocUpdated, setNotifyDocUpdated] = React.useState<boolean>(
    initialNotificationPreferences.documentUpdated
  )
  const [suppressOnDashboard, setSuppressOnDashboard] = React.useState<boolean>(
    initialNotificationPreferences.suppressOnDashboard
  )
  const setNotificationPreferences = useSetAtom(setNotificationPreferencesAtom)
  const { pending: saving, run: handleSave } = useAsyncAction({
    action: async () =>
      updateUiSettings({
        date_locale: dateLocale,
        default_page_size: Number(defaultPageSize),
        notifications_consumer_new_document: notifyNewDoc,
        notifications_consumer_success: notifyConsumerSuccess,
        notifications_consumer_failed: notifyConsumerFailed,
        notifications_consumer_suppress_on_dashboard: suppressOnDashboard,
        notifications_document_added: notifyConsumerSuccess,
        notifications_document_updated: notifyDocUpdated,
      }),
    errorMessage: "Failed to save preferences",
    successMessage: "Preferences saved",
    onSuccess: () => {
      setNotificationPreferences({
        consumerFailed: notifyConsumerFailed,
        consumerNewDocument: notifyNewDoc,
        consumerSuccess: notifyConsumerSuccess,
        documentUpdated: notifyDocUpdated,
        suppressOnDashboard,
      })
    },
  })

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
          <Select
            value={dateLocale || "__browser_default__"}
            onValueChange={(value) =>
              setDateLocale(value === "__browser_default__" ? "" : value)
            }
          >
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
            <p className="text-sm font-medium">Document detected</p>
            <p className="text-xs text-muted-foreground">Notify when a new document starts processing.</p>
          </div>
          <Switch
            checked={notifyNewDoc}
            onCheckedChange={setNotifyNewDoc}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Document consumed</p>
            <p className="text-xs text-muted-foreground">Notify when processing succeeds and a document is created.</p>
          </div>
          <Switch
            checked={notifyConsumerSuccess}
            onCheckedChange={setNotifyConsumerSuccess}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Document failed</p>
            <p className="text-xs text-muted-foreground">Notify when a document cannot be processed.</p>
          </div>
          <Switch
            checked={notifyConsumerFailed}
            onCheckedChange={setNotifyConsumerFailed}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Document updated</p>
            <p className="text-xs text-muted-foreground">Notify when a document&apos;s metadata is updated.</p>
          </div>
          <Switch
            checked={notifyDocUpdated}
            onCheckedChange={setNotifyDocUpdated}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Suppress popup toasts on dashboard</p>
            <p className="text-xs text-muted-foreground">Keep the notification history, but avoid popup toasts while you are on the dashboard.</p>
          </div>
          <Switch
            checked={suppressOnDashboard}
            onCheckedChange={setSuppressOnDashboard}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={() => void handleSave()} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </div>
  )
}
