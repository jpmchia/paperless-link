import { getJson } from "@/lib/paperless-client"

export interface UiSettingsRecord {
  settings?: Record<string, unknown>
}

export async function fetchUiSettings() {
  return getJson<UiSettingsRecord>("/api/proxy/ui_settings/")
}
