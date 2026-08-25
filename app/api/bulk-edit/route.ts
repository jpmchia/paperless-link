import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { NextResponse } from "next/server"
import { paperlessJsonAccept } from "@/lib/paperless-transport"
import { resolveSelectionDocumentIds } from "@/lib/server/document-selection-resolve"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"

async function getToken() {
  const session = await getServerSession(authOptions)
  const token = session?.accessToken
  if (!token) return null
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
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json() as Record<string, unknown>
  const excludedDocumentIds = Array.isArray(body.excluded_document_ids)
    ? body.excluded_document_ids.filter((id): id is number => Number.isInteger(id))
    : []

  delete body.excluded_document_ids

  if (body.all === true && excludedDocumentIds.length > 0) {
    try {
      body.documents = await resolveSelectionDocumentIds(token, {
        all: true,
        filters: body.filters,
        excluded_document_ids: excludedDocumentIds,
      })
      body.all = false
      delete body.filters
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to resolve filtered selection",
        },
        { status: 500 }
      )
    }
  }

  const res = await fetch(`${baseUrl}api/documents/bulk_edit/`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    return NextResponse.json({ error: err }, { status: res.status })
  }
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data)
}
