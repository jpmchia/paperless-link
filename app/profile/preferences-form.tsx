"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { setNotificationPreferencesAtom } from "@/lib/stores/notifications"
import { updateUiSettings } from "@/app/actions/ui-settings"
import type { ThemePresetSummary } from "@/lib/theme-preset-types"
import { GlobalSearchType, PAPERLESS_GREEN_HEX } from "@/data/ui-settings"
import {
  readUserPreferences,
  serializeUserPreferencesPatch,
} from "@/lib/user-preferences"

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

const DATE_STYLE_OPTIONS = [
  { value: "shortDate", label: "Short", description: "08/25/2026" },
  { value: "mediumDate", label: "Medium", description: "Aug 25, 2026" },
  { value: "longDate", label: "Long", description: "August 25, 2026" },
] as const

const SEARCH_DESTINATION_OPTIONS = [
  {
    value: GlobalSearchType.TITLE_CONTENT,
    label: "Title and content search",
  },
  {
    value: GlobalSearchType.ADVANCED,
    label: "Advanced search",
  },
] as const

export interface PreferencesFormProps {
  initialSettings?: {
    settings?: Record<string, unknown>
  } | null
  themePresets?: ThemePresetSummary[]
}

export function PreferencesForm({ initialSettings, themePresets = [] }: PreferencesFormProps) {
  const router = useRouter()
  const preferences = React.useMemo(
    () => readUserPreferences(initialSettings?.settings),
    [initialSettings?.settings]
  )

  const [dateLocale, setDateLocale] = React.useState<string>(preferences.dateLocale)
  const [dateFormat, setDateFormat] = React.useState<string>(preferences.dateFormat)
  const [defaultPageSize, setDefaultPageSize] = React.useState<string>(
    String(preferences.pageSize)
  )
  const [slimSidebar, setSlimSidebar] = React.useState<boolean>(
    preferences.slimSidebar
  )
  const [darkModeThumbInverted, setDarkModeThumbInverted] =
    React.useState<boolean>(preferences.darkModeThumbInverted)
  const [themeColor, setThemeColor] = React.useState<string>(
    preferences.themeColor
  )
  const [themePresetId, setThemePresetId] = React.useState<string>(
    typeof preferences.themePresetId === "string" && preferences.themePresetId.length > 0
      ? preferences.themePresetId
      : "__system_default__"
  )
  const [notifyNewDoc, setNotifyNewDoc] = React.useState<boolean>(
    preferences.notifications.consumerNewDocument
  )
  const [notifyConsumerSuccess, setNotifyConsumerSuccess] = React.useState<boolean>(
    preferences.notifications.consumerSuccess
  )
  const [notifyConsumerFailed, setNotifyConsumerFailed] = React.useState<boolean>(
    preferences.notifications.consumerFailed
  )
  const [notifyDocUpdated, setNotifyDocUpdated] = React.useState<boolean>(
    preferences.notifications.documentUpdated
  )
  const [suppressOnDashboard, setSuppressOnDashboard] = React.useState<boolean>(
    preferences.notifications.suppressOnDashboard
  )
  const [searchDbOnly, setSearchDbOnly] = React.useState<boolean>(
    preferences.searchDbOnly
  )
  const [searchFullType, setSearchFullType] = React.useState<string>(
    preferences.searchFullType
  )
  const setNotificationPreferences = useSetAtom(setNotificationPreferencesAtom)
  const { pending: saving, run: handleSave } = useAsyncAction({
    action: async () =>
      updateUiSettings(
        serializeUserPreferencesPatch({
          dateFormat,
          dateLocale,
          darkModeThumbInverted,
          notifications: {
            consumerFailed: notifyConsumerFailed,
            consumerNewDocument: notifyNewDoc,
            consumerSuccess: notifyConsumerSuccess,
            documentUpdated: notifyDocUpdated,
            suppressOnDashboard,
          },
          pageSize: Number(defaultPageSize),
          searchDbOnly,
          searchFullType:
            searchFullType === GlobalSearchType.ADVANCED
              ? GlobalSearchType.ADVANCED
              : GlobalSearchType.TITLE_CONTENT,
          slimSidebar,
          themeColor,
          themePresetId:
            themePresetId === "__system_default__" ? null : themePresetId,
        })
      ),
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
      router.refresh()
    },
  })

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h3 className="text-lg font-medium">Display</h3>
        <p className="text-sm text-muted-foreground">Appearance and formatting preferences.</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="preferences-date-locale">Date locale</Label>
          <Select
            value={dateLocale || "__browser_default__"}
            onValueChange={(value) =>
              setDateLocale(value === "__browser_default__" ? "" : value)
            }
          >
            <SelectTrigger
              id="preferences-date-locale"
              aria-label="Date locale"
              className="w-72"
            >
              <SelectValue placeholder="Browser default" />
            </SelectTrigger>
            <SelectContent>
              {DATE_LOCALE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose which locale is used when formatting dates throughout the app.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="preferences-date-style">Date style</Label>
          <Select value={dateFormat} onValueChange={setDateFormat}>
            <SelectTrigger
              id="preferences-date-style"
              aria-label="Date style"
              className="w-72"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_STYLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {DATE_STYLE_OPTIONS.find((option) => option.value === dateFormat)?.description ??
              "Aug 25, 2026"}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border px-3 py-3">
          <div>
            <p className="text-sm font-medium">Slim sidebar</p>
            <p className="text-xs text-muted-foreground">
              Collapse the desktop sidebar to its icon rail by default.
            </p>
          </div>
          <Switch
            aria-label="Slim sidebar"
            checked={slimSidebar}
            onCheckedChange={setSlimSidebar}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border px-3 py-3">
          <div>
            <p className="text-sm font-medium">Invert thumbnails in dark mode</p>
            <p className="text-xs text-muted-foreground">
              Improve readability for scanned document previews when dark mode is active.
            </p>
          </div>
          <Switch
            aria-label="Invert thumbnails in dark mode"
            checked={darkModeThumbInverted}
            onCheckedChange={setDarkModeThumbInverted}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferences-theme-preset">Theme preset</Label>
          <Select value={themePresetId} onValueChange={setThemePresetId}>
            <SelectTrigger
              id="preferences-theme-preset"
              aria-label="Theme preset"
              className="w-72"
            >
              <SelectValue placeholder="System default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__system_default__">System default</SelectItem>
              {themePresets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Use an administrator-defined theme preset as the base visual style.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Reset theme preset"
            className="px-0 text-xs"
            disabled={themePresetId === "__system_default__"}
            onClick={() => setThemePresetId("__system_default__")}
          >
            Reset
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferences-theme-color">Theme color override</Label>
          <div className="flex items-center gap-2">
            <Input
              id="preferences-theme-color"
              aria-label="Theme color override"
              value={themeColor}
              onChange={(event) => setThemeColor(event.target.value)}
              placeholder={PAPERLESS_GREEN_HEX}
              className="w-72"
            />
            <div
              className="h-9 w-9 rounded-md border"
              aria-hidden="true"
              style={{
                backgroundColor: themeColor.trim() || PAPERLESS_GREEN_HEX,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Overrides the preset accent color without replacing the base preset variables.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Reset theme color"
            className="px-0 text-xs"
            disabled={themeColor.length === 0}
            onClick={() => setThemeColor("")}
          >
            Reset
          </Button>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-medium">Documents</h3>
        <p className="text-sm text-muted-foreground">Defaults for document browsing.</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="preferences-default-page-size">Default page size</Label>
          <Select value={defaultPageSize} onValueChange={setDefaultPageSize}>
            <SelectTrigger
              id="preferences-default-page-size"
              aria-label="Default page size"
              className="w-48"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_PAGESIZE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Default number of documents shown per page in document listings.
          </p>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-medium">Search</h3>
        <p className="text-sm text-muted-foreground">How global search behaves.</p>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border px-3 py-3">
          <div>
            <p className="text-sm font-medium">Do not include advanced search results</p>
            <p className="text-xs text-muted-foreground">
              Restrict live global search results to database-backed matches only.
            </p>
          </div>
          <Switch
            aria-label="Do not include advanced search results"
            checked={searchDbOnly}
            onCheckedChange={setSearchDbOnly}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="preferences-search-destination">Full search links to</Label>
          <Select value={searchFullType} onValueChange={setSearchFullType}>
            <SelectTrigger
              id="preferences-search-destination"
              aria-label="Full search links to"
              className="w-72"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_DESTINATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose whether the “search all documents” action opens title/content search
            or advanced full-text search.
          </p>
        </div>
      </div>

      <Separator />

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
