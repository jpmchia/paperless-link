"use server"

import { revalidatePath } from "next/cache"
import { updateUiSettings } from "@/app/actions/ui-settings"
import type { DocumentDisplayMode } from "./display-mode"
import type { SavedViewRule } from "@/components/saved-views/filter-rule-editor"
import { getPaperlessApi } from "@/lib/api"
import {
  getPaperlessApiVersion,
  getPaperlessBaseUrl,
  paperlessJsonAccept,
  resolvePaperlessAccessToken,
} from "@/lib/paperless-transport"
import {
  patchSavedViewVisibilitySettings,
  stripLegacyVisibilityFields,
} from "@/lib/saved-view-visibility"
import type { UiSettingsRecord } from "@/lib/ui-settings"

async function getToken() {
  const token = await resolvePaperlessAccessToken()
  if (!token) throw new Error("Unauthorized")
  return token
}

type SavedViewMutation = {
  filter_rules?: SavedViewRule[]
  sort_field?: string
  sort_reverse?: boolean
  display_mode?: DocumentDisplayMode | null
  display_fields?: string[]
  name?: string
  page_size?: number | null
  show_on_dashboard?: boolean
  show_in_sidebar?: boolean
  owner?: number | null
  set_permissions?: {
    view: { users: number[]; groups: number[] }
    change: { users: number[]; groups: number[] }
  }
}

async function syncVisibility(
  viewId: number,
  data: { show_on_dashboard?: boolean; show_in_sidebar?: boolean }
) {
  if (
    getPaperlessApiVersion() < 10 ||
    (data.show_on_dashboard === undefined && data.show_in_sidebar === undefined)
  ) {
    return
  }
  const current = (await getPaperlessApi("ui_settings/")) as UiSettingsRecord
  const merged = patchSavedViewVisibilitySettings(
    (current?.settings as Record<string, unknown> | undefined) ?? {},
    viewId,
    data
  )
  await updateUiSettings(merged)
}

export async function patchSavedView(id: number, data: SavedViewMutation) {
  const token = await getToken()
  const apiVersion = getPaperlessApiVersion()
  const body =
    apiVersion >= 10
      ? stripLegacyVisibilityFields({ ...data })
      : data

  const res = await fetch(`${getPaperlessBaseUrl()}api/saved_views/${id}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: paperlessJsonAccept(),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to save view: ${err}`)
  }
  await syncVisibility(id, data)
  revalidatePath("/documents")
  revalidatePath(`/view/${id}`)
  revalidatePath("/savedviews")
  revalidatePath("/dashboard")
  return res.json()
}

export async function createSavedView(data: {
  name: string
  filter_rules: SavedViewRule[]
  sort_field?: string
  sort_reverse?: boolean
  display_mode?: DocumentDisplayMode | null
  display_fields?: string[]
  page_size?: number
  show_on_dashboard?: boolean
  show_in_sidebar?: boolean
  owner?: number | null
  set_permissions?: {
    view: { users: number[]; groups: number[] }
    change: { users: number[]; groups: number[] }
  }
}) {
  const token = await getToken()
  const apiVersion = getPaperlessApiVersion()
  const body =
    apiVersion >= 10
      ? stripLegacyVisibilityFields({ ...data })
      : data

  const res = await fetch(`${getPaperlessBaseUrl()}api/saved_views/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: paperlessJsonAccept(),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create view: ${err}`)
  }
  const created = (await res.json()) as { id: number }
  await syncVisibility(created.id, data)
  revalidatePath("/documents")
  revalidatePath("/savedviews")
  revalidatePath("/dashboard")
  return created
}

export async function deleteSavedView(id: number) {
  const token = await getToken()
  const res = await fetch(`${getPaperlessBaseUrl()}api/saved_views/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Token ${token}`,
      Accept: paperlessJsonAccept(),
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to delete view ${id}`)
  }
  revalidatePath("/documents")
}
