"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { revalidatePath } from "next/cache"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"

export async function updateDocument(id: number | string, data: any) {
  const session = await getServerSession(authOptions as any)
  const token = (session as any)?.accessToken

  if (!token) {
    throw new Error("Unauthorized")
  }

  const response = await fetch(`${baseUrl}api/documents/${id}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json; version=2",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    console.error(`Failed to patch document ${id}. Status: ${response.status}`, await response.text())
    throw new Error(`Failed to update document: ${response.statusText}`)
  }

  revalidatePath(`/documents/${id}`)
  revalidatePath(`/documents`)

  return response.json()
}

export async function deleteDocument(id: number | string) {
  const session = await getServerSession(authOptions as any)
  const token = (session as any)?.accessToken

  if (!token) {
    throw new Error("Unauthorized")
  }

  const response = await fetch(`${baseUrl}api/documents/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Token ${token}`,
      Accept: "application/json; version=2",
    },
  })

  if (!response.ok) {
    console.error(`Failed to delete document ${id}. Status: ${response.status}`, await response.text())
    throw new Error(`Failed to delete document: ${response.statusText}`)
  }

  revalidatePath(`/documents`)
}

export async function reprocessDocument(id: number | string) {
  const session = await getServerSession(authOptions as any)
  const token = (session as any)?.accessToken

  if (!token) {
    throw new Error("Unauthorized")
  }

  const response = await fetch(`${baseUrl}api/documents/reprocess/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json; version=2",
    },
    body: JSON.stringify({
      documents: [Number(id)],
    }),
  })

  // Paperless-ngx reprocess might return 200 or 202
  if (!response.ok) {
    console.error(`Failed to reprocess document ${id}. Status: ${response.status}`, await response.text())
    throw new Error(`Failed to reprocess document: ${response.statusText}`)
  }

  revalidatePath(`/documents/${id}`)
  revalidatePath(`/documents`)
}
