"use server"

import { getPaperlessApi } from "@/lib/api"
import { authOptions } from "@/auth"
import { getServerSession } from "next-auth"
import type { UiSettingsRecord } from "@/lib/ui-settings"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"

async function writeUiSettings(settings: Record<string, unknown>) {
  const session = (await getServerSession(authOptions)) as {
    accessToken?: string
  } | null
  const token = session?.accessToken

  if (!token) {
    throw new Error("Unauthorized: No access token available")
  }

  const url = `${baseUrl}api/ui_settings/`
  const headers = {
    Authorization: `Token ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json; version=2",
  }
  const body = JSON.stringify({ settings })

  const patchResponse = await fetch(url, {
    method: "PATCH",
    headers,
    body,
    next: { revalidate: 0 },
  })

  if (patchResponse.ok) {
    return (await patchResponse.json()) as UiSettingsRecord
  }

  if (patchResponse.status !== 405) {
    throw new Error(`API Error ${patchResponse.status}: ${patchResponse.statusText}`)
  }

  const putResponse = await fetch(url, {
    method: "PUT",
    headers,
    body,
    next: { revalidate: 0 },
  })

  if (!putResponse.ok) {
    throw new Error(`API Error ${putResponse.status}: ${putResponse.statusText}`)
  }

  return (await putResponse.json()) as UiSettingsRecord
}

export async function updateUiSettings(
  patch: Record<string, unknown>
): Promise<UiSettingsRecord> {
  const current = (await getPaperlessApi("ui_settings/")) as UiSettingsRecord
  const merged = {
    ...((current?.settings as Record<string, unknown> | undefined) ?? {}),
    ...patch,
  }

  return await writeUiSettings(merged)
}
