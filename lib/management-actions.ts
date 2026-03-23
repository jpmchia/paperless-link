"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { revalidatePath } from "next/cache"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"

async function getToken() {
  const session = await getServerSession(authOptions)
  const token = session?.accessToken
  if (!token) throw new Error("Unauthorized")
  return token
}

async function apiRequest(method: string, endpoint: string, body?: object) {
  const token = await getToken()
  const res = await fetch(`${baseUrl}api/${endpoint}`, {
    method,
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json; version=2",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`API ${method} ${endpoint} failed: ${err}`)
  }
  return method === "DELETE" ? null : res.json()
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export async function createTag(data: {
  name: string
  color?: string
  matching_algorithm?: number
  match?: string
  is_insensitive?: boolean
  is_inbox_tag?: boolean
}) {
  const result = await apiRequest("POST", "tags/", data)
  revalidatePath("/tags")
  return result
}

export async function updateTag(id: number, data: Partial<{
  name: string
  color: string
  matching_algorithm: number
  match: string
  is_insensitive: boolean
}>) {
  const result = await apiRequest("PATCH", `tags/${id}/`, data)
  revalidatePath("/tags")
  return result
}

export async function deleteTag(id: number) {
  await apiRequest("DELETE", `tags/${id}/`)
  revalidatePath("/tags")
}

// ── Correspondents ────────────────────────────────────────────────────────────

export async function createCorrespondent(data: {
  name: string
  matching_algorithm?: number
  match?: string
  is_insensitive?: boolean
}) {
  const result = await apiRequest("POST", "correspondents/", data)
  revalidatePath("/correspondents")
  return result
}

export async function updateCorrespondent(id: number, data: Partial<{
  name: string
  matching_algorithm: number
  match: string
  is_insensitive: boolean
}>) {
  const result = await apiRequest("PATCH", `correspondents/${id}/`, data)
  revalidatePath("/correspondents")
  return result
}

export async function deleteCorrespondent(id: number) {
  await apiRequest("DELETE", `correspondents/${id}/`)
  revalidatePath("/correspondents")
}

// ── Document Types ─────────────────────────────────────────────────────────────

export async function createDocumentType(data: {
  name: string
  matching_algorithm?: number
  match?: string
  is_insensitive?: boolean
}) {
  const result = await apiRequest("POST", "document_types/", data)
  revalidatePath("/document-types")
  return result
}

export async function updateDocumentType(id: number, data: Partial<{
  name: string
  matching_algorithm: number
  match: string
  is_insensitive: boolean
}>) {
  const result = await apiRequest("PATCH", `document_types/${id}/`, data)
  revalidatePath("/document-types")
  return result
}

export async function deleteDocumentType(id: number) {
  await apiRequest("DELETE", `document_types/${id}/`)
  revalidatePath("/document-types")
}

// ── Saved Views (supplementing existing actions) ──────────────────────────────

export async function updateSavedViewMeta(id: number, data: Partial<{
  name: string
  show_on_dashboard: boolean
  show_in_sidebar: boolean
  page_size: number
}>) {
  const result = await apiRequest("PATCH", `saved_views/${id}/`, data)
  revalidatePath("/savedviews")
  revalidatePath(`/view/${id}`)
  return result
}

export async function deleteSavedViewManagement(id: number) {
  await apiRequest("DELETE", `saved_views/${id}/`)
  revalidatePath("/savedviews")
  revalidatePath("/documents")
}

// ── Storage Paths ─────────────────────────────────────────────────────────────

export async function createStoragePath(data: {
  name: string
  path?: string
  matching_algorithm?: number
  match?: string
  is_insensitive?: boolean
}) {
  const result = await apiRequest("POST", "storage_paths/", data)
  revalidatePath("/storage-paths")
  return result
}

export async function updateStoragePath(id: number, data: Partial<{
  name: string
  path: string
  matching_algorithm: number
  match: string
  is_insensitive: boolean
}>) {
  const result = await apiRequest("PATCH", `storage_paths/${id}/`, data)
  revalidatePath("/storage-paths")
  return result
}

export async function deleteStoragePath(id: number) {
  await apiRequest("DELETE", `storage_paths/${id}/`)
  revalidatePath("/storage-paths")
}

// ── Custom Fields ─────────────────────────────────────────────────────────────

export async function createCustomField(data: {
  name: string
  data_type: string
  extra_data?: {
    select_options?: Array<string | { label: string; id?: string }>
  }
}) {
  const result = await apiRequest("POST", "custom_fields/", data)
  revalidatePath("/custom-fields")
  return result
}

export async function updateCustomField(id: number, data: Partial<{
  name: string
  extra_data: {
    select_options?: Array<string | { label: string; id?: string }>
  }
}>) {
  const result = await apiRequest("PATCH", `custom_fields/${id}/`, data)
  revalidatePath("/custom-fields")
  return result
}

export async function deleteCustomField(id: number) {
  await apiRequest("DELETE", `custom_fields/${id}/`)
  revalidatePath("/custom-fields")
}
