import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { NextResponse } from "next/server"
import { paperlessJsonAccept } from "@/lib/paperless-transport"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"
const DOCUMENT_ID_PAGE_SIZE = 500

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

async function listFilteredDocumentIds(
  token: string,
  filters: Record<string, string>
) {
  const ids: number[] = []
  let page = 1

  while (true) {
    const params = new URLSearchParams(filters)
    params.set("page", String(page))
    params.set("page_size", String(DOCUMENT_ID_PAGE_SIZE))
    params.set("fields", "id")

    const response = await fetch(`${baseUrl}api/documents/?${params.toString()}`, {
      headers: buildHeaders(token),
    })

    if (!response.ok) {
      throw new Error(await response.text().catch(() => response.statusText))
    }

    const data = await response.json() as {
      next?: string | null
      results?: Array<{ id?: number }>
    }
    const pageIds = (data.results ?? [])
      .map((document) => document.id)
      .filter((id): id is number => Number.isInteger(id))

    ids.push(...pageIds)

    if (!data.next) {
      break
    }

    page += 1
  }

  return ids
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
      const filters = body.filters && typeof body.filters === "object" && !Array.isArray(body.filters)
        ? Object.fromEntries(
            Object.entries(body.filters as Record<string, unknown>)
              .filter(([, value]) => value != null)
              .map(([key, value]) => [key, String(value)])
          )
        : {}
      const excluded = new Set(excludedDocumentIds)
      const documentIds = await listFilteredDocumentIds(token, filters)

      body.documents = documentIds.filter((id) => !excluded.has(id))
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
