"use server"

import { getPaperlessApi } from "@/lib/api"
import { authOptions } from "@/auth"
import { getServerSession } from "next-auth"
import type { UiSettingsRecord } from "@/lib/ui-settings"
import { paperlessJsonAccept } from "@/lib/paperless-transport"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"
const configuredToken = process.env.PAPERLESS_API_TOKEN?.trim()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function mergeUiSettings(
  current: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...current }

  for (const [key, value] of Object.entries(patch)) {
    if (isRecord(value) && isRecord(merged[key])) {
      merged[key] = mergeUiSettings(
        merged[key] as Record<string, unknown>,
        value
      )
      continue
    }

    merged[key] = value
  }

  return merged
}

async function writeUiSettings(settings: Record<string, unknown>) {
  const session = (await getServerSession(authOptions)) as {
    accessToken?: string
  } | null
  const token = configuredToken || session?.accessToken

  if (!token) {
    throw new Error("Unauthorized: No access token available in session or config")
  }

  const url = `${baseUrl}api/ui_settings/`
  const headers = {
    Authorization: `Token ${token}`,
    "Content-Type": "application/json",
    Accept: paperlessJsonAccept(),
  }
  const body = JSON.stringify({ settings })

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    throw new Error(`API Error ${response.status}: ${response.statusText}`)
  }

  return (await response.json()) as UiSettingsRecord
}

export async function updateUiSettings(
  patch: Record<string, unknown>
): Promise<UiSettingsRecord> {
  const current = (await getPaperlessApi("ui_settings/")) as UiSettingsRecord
  const merged = mergeUiSettings(
    ((current?.settings as Record<string, unknown> | undefined) ?? {}),
    patch
  )

  return await writeUiSettings(merged)
}
