"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { revalidatePath } from "next/cache"
import { paperlessJsonAccept } from "@/lib/paperless-transport"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"
type AccessTokenSession = { accessToken?: string } | null

async function getAccessToken() {
  const session = (await getServerSession(authOptions as never)) as AccessTokenSession
  const token = session?.accessToken

  if (!token) {
    throw new Error("Unauthorized")
  }

  return token
}

export async function updateDocument(id: number | string, data: unknown) {
  const token = await getAccessToken()

  const response = await fetch(`${baseUrl}api/documents/${id}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: paperlessJsonAccept(),
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const responseText = await response.text()
    console.error(`Failed to patch document ${id}. Status: ${response.status}`, responseText)

    let detail = response.statusText
    try {
      const parsed = JSON.parse(responseText)
      detail =
        parsed?.detail ||
        parsed?.error ||
        JSON.stringify(parsed)
    } catch {
      if (responseText.trim().length > 0) {
        detail = responseText
      }
    }

    throw new Error(`Failed to update document: ${detail}`)
  }

  revalidatePath(`/documents/${id}`)
  revalidatePath(`/documents`)

  return response.json()
}

export async function deleteDocument(id: number | string) {
  const token = await getAccessToken()

  const response = await fetch(`${baseUrl}api/documents/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Token ${token}`,
      Accept: paperlessJsonAccept(),
    },
  })

  if (!response.ok) {
    console.error(`Failed to delete document ${id}. Status: ${response.status}`, await response.text())
    throw new Error(`Failed to delete document: ${response.statusText}`)
  }

  revalidatePath(`/documents`)
}

export async function reprocessDocument(
  id: number | string,
  options?: { remoteOcr?: boolean }
) {
  const token = await getAccessToken()

  const response = await fetch(`${baseUrl}api/documents/reprocess/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: paperlessJsonAccept(),
    },
    body: JSON.stringify({
      documents: [Number(id)],
      remote_ocr: Boolean(options?.remoteOcr),
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

export async function removeDocumentPassword(
  id: number | string,
  data: {
    password: string
    update_document?: boolean
    delete_original?: boolean
    include_metadata?: boolean
    source_mode?: "explicit_selection"
  }
) {
  const token = await getAccessToken()

  const response = await fetch(`${baseUrl}api/documents/remove_password/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: paperlessJsonAccept(),
    },
    body: JSON.stringify({
      documents: [Number(id)],
      ...data,
    }),
  })

  if (!response.ok) {
    const responseText = await response.text()
    console.error(`Failed to remove password from document ${id}. Status: ${response.status}`, responseText)

    let detail = response.statusText
    try {
      const parsed = JSON.parse(responseText)
      detail = parsed?.detail || parsed?.error || JSON.stringify(parsed)
    } catch {
      if (responseText.trim().length > 0) {
        detail = responseText
      }
    }

    throw new Error(`Failed to remove password: ${detail}`)
  }

  revalidatePath(`/documents/${id}`)
  revalidatePath(`/documents`)
}
