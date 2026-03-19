"use server"

import { getPaperlessApi } from "@/lib/api"
import type { UiSettingsRecord } from "@/lib/ui-settings"

export async function updateUiSettings(
  patch: Record<string, unknown>
): Promise<UiSettingsRecord> {
  const current = (await getPaperlessApi("ui_settings/")) as UiSettingsRecord
  const merged = {
    ...((current?.settings as Record<string, unknown> | undefined) ?? {}),
    ...patch,
  }

  return (await getPaperlessApi("ui_settings/", {
    method: "PATCH",
    body: JSON.stringify({
      settings: merged,
    }),
  })) as UiSettingsRecord
}
