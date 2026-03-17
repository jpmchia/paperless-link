"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { revalidatePath } from "next/cache"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"

async function getToken() {
  const session = await getServerSession(authOptions as any)
  const token = (session as any)?.accessToken
  if (!token) throw new Error("Unauthorized")
  return token
}

export async function patchSavedView(id: number, data: {
  filter_rules?: any[]
  sort_field?: string
  sort_reverse?: boolean
  display_mode?: string
  display_fields?: string[]
  name?: string
  page_size?: number
}) {
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
  return res.json()
}

export async function createSavedView(data: {
  name: string
  filter_rules: any[]
  sort_field?: string
  sort_reverse?: boolean
  display_mode?: string
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
