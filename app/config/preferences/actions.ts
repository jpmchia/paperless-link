"use server"

import { revalidatePath } from "next/cache"
import { getUiSettings } from "@/lib/api"
import {
  canManageConfig,
  mapPermissionBootstrapPayload,
  type PermissionBootstrapPayload,
} from "@/lib/permissions"
import { saveThemePreset } from "@/lib/theme-presets"
import type { ThemePresetDraft } from "@/lib/theme-preset-types"

async function requireAdminThemeAccess() {
  const uiSettings = await getUiSettings().catch(() => null)
  const permissions = mapPermissionBootstrapPayload(
    uiSettings as PermissionBootstrapPayload | null
  )

  if (!canManageConfig(permissions)) {
    throw new Error("You do not have permission to manage shared themes")
  }
}

export async function saveSharedThemePreset(input: {
  id?: string
  name: string
  description?: string
  draft: ThemePresetDraft
  variables: Record<string, string>
}) {
  await requireAdminThemeAccess()

  const preset = await saveThemePreset(input)

  revalidatePath("/config/preferences")
  revalidatePath("/settings")

  return preset
}
