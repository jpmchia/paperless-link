import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { isBulkDownloadContent } from "@/lib/bulk-download"
import { resolveSelectionDocumentIds } from "@/lib/server/document-selection-resolve"
import { NextResponse } from "next/server"

function getBaseUrl() {
  return process.env.PAPERLESS_API_URL || "http://localhost:8000/"
}

async function getToken() {
  const session = await getServerSession(authOptions)
  const token = session?.accessToken
  if (!token) return null
  return token
}

export async function POST(req: Request) {
  const token = await getToken()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const rawContent = "content" in body ? body.content : undefined
  if (!isBulkDownloadContent(rawContent)) {
    return NextResponse.json(
      { error: "Select at least one file type to download." },
      { status: 400 }
    )
  }

  const followFormatting =
    "follow_formatting" in body ? body.follow_formatting === true : false

  const documents = await resolveSelectionDocumentIds(token, body)
  const res = await fetch(`${getBaseUrl()}api/documents/bulk_download/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/zip",
    },
    body: JSON.stringify({
      documents,
      content: rawContent,
      follow_formatting: followFormatting,
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const headers = new Headers()
  headers.set("Content-Type", res.headers.get("Content-Type") || "application/zip")
  headers.set(
    "Content-Disposition",
    res.headers.get("Content-Disposition") ||
      'attachment; filename="documents.zip"'
  )
  return new NextResponse(res.body, { headers })
}
