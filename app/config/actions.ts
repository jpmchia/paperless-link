"use server"

import { authOptions } from "@/auth"
import { getServerSession } from "next-auth"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"

async function getAccessToken() {
  const session = (await getServerSession(authOptions)) as {
    accessToken?: string
  } | null

  if (!session?.accessToken) {
    throw new Error("Unauthorized: No access token available")
  }

  return session.accessToken
}

async function requestConfig<T>(path: string, init: RequestInit): Promise<T> {
  const token = await getAccessToken()
  const response = await fetch(`${baseUrl}api/${path}`, {
    ...init,
    headers: {
      Authorization: `Token ${token}`,
      Accept: "application/json; version=2",
      ...(init.headers ?? {}),
    },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? ""
    let message = `${response.status}: ${response.statusText}`

    try {
      if (contentType.includes("application/json")) {
        const body = (await response.json()) as Record<string, unknown>
        const detail =
          (typeof body.detail === "string" && body.detail) ||
          (Array.isArray(body.non_field_errors) && typeof body.non_field_errors[0] === "string" && body.non_field_errors[0])
        if (detail) {
          message = detail
        }
      } else {
        const text = await response.text()
        if (text.trim()) {
          message = text
        }
      }
    } catch {
      // Ignore secondary parsing failures and keep the status message.
    }

    throw new Error(message)
  }

  return (await response.json()) as T
}

export async function updateConfig(
  id: number,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return requestConfig<Record<string, unknown>>(`config/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
}

export async function uploadConfigLogo(
  id: number,
  file: File
): Promise<Record<string, unknown>> {
  const formData = new FormData()
  formData.append("app_logo", file)

  return requestConfig<Record<string, unknown>>(`config/${id}/`, {
    method: "PATCH",
    body: formData,
  })
}
