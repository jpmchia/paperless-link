"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { revalidatePath } from "next/cache"
import type { DocumentDisplayMode } from "./display-mode"
import type { SavedViewRule } from "@/components/saved-views/filter-rule-editor"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"
type AccessTokenSession = { accessToken?: string } | null

async function getToken() {
  const configuredToken = process.env.PAPERLESS_API_TOKEN?.trim()
  if (configuredToken) {
    return configuredToken
  }

  const session = (await getServerSession(authOptions as never)) as AccessTokenSession
  const token = session?.accessToken?.trim()
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
}

export async function patchSavedView(id: number, data: SavedViewMutation) {
  const token = await getToken()
  const res = await fetch(`${baseUrl}api/saved_views/${id}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json; version=2",
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to save view: ${err}`)
  }
  revalidatePath("/documents")
  revalidatePath(`/view/${id}`)
  revalidatePath("/savedviews")
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
}) {
  const token = await getToken()
  const res = await fetch(`${baseUrl}api/saved_views/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json; version=2",
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create view: ${err}`)
  }
  revalidatePath("/documents")
  revalidatePath("/savedviews")
  return res.json()
}

export async function deleteSavedView(id: number) {
  const token = await getToken()
  const res = await fetch(`${baseUrl}api/saved_views/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Token ${token}`,
      Accept: "application/json; version=2",
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to delete view ${id}`)
  }
  revalidatePath("/documents")
}
