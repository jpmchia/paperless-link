import { getJson, patchJson } from "@/lib/paperless-client"

export interface UiSettingsRecord {
  settings?: Record<string, unknown>
}

export async function fetchUiSettings() {
  return getJson<UiSettingsRecord>("/api/proxy/ui_settings/")
}

export async function updateUiSettings(
  patch: Record<string, unknown>
) {
  const current = await fetchUiSettings()
  const merged = {
    ...((current?.settings as Record<string, unknown> | undefined) ?? {}),
    ...patch,
  }

  return patchJson<UiSettingsRecord>("/api/proxy/ui_settings/", {
    settings: merged,
  })
}
