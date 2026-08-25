import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { normalizeSelectionData } from "@/lib/bulk-selection-data"
import { paperlessJsonAccept } from "@/lib/paperless-transport"
import { resolveSelectionDocumentIds } from "@/lib/server/document-selection-resolve"

function getBaseUrl() {
  return process.env.PAPERLESS_API_URL || "http://localhost:8000/"
}

async function getToken() {
  const session = await getServerSession(authOptions)
  const token = session?.accessToken
  if (!token) {
    return null
  }

  return token
}

function buildHeaders(token: string) {
  return {
    Authorization: `Token ${token}`,
    "Content-Type": "application/json",
    Accept: paperlessJsonAccept(),
  }
}

export async function POST(req: Request) {
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as {
      all?: unknown
      documents?: unknown
      excluded_document_ids?: unknown
      filters?: unknown
    }
    const documents = await resolveSelectionDocumentIds(token, body)
    const response = await fetch(`${getBaseUrl()}api/documents/selection_data/`, {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify({ documents }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      return NextResponse.json({ error: errorText }, { status: response.status })
    }

    const payload = await response.json().catch(() => ({}))
    return NextResponse.json(normalizeSelectionData(payload))
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load document selection data",
      },
      { status: 500 }
    )
  }
}
