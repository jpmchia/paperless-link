import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"
const configuredToken = process.env.PAPERLESS_API_TOKEN?.trim()

type LookupKind = "correspondents" | "document-types" | "tags" | "custom-fields"

function resolveEndpoint(kind: LookupKind) {
  switch (kind) {
    case "correspondents":
      return "correspondents/?page_size=100000"
    case "document-types":
      return "document_types/?page_size=100000"
    case "tags":
      return "tags/?page_size=100000"
    case "custom-fields":
      return "custom_fields/?page_size=100000"
    default:
      return null
  }
}

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as { accessToken?: string } | null
  const token = session?.accessToken || configuredToken
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const kind = (url.searchParams.get("kind") || "").trim() as LookupKind
  const endpoint = resolveEndpoint(kind)
  if (!endpoint) {
    return NextResponse.json({ error: "Invalid lookup kind" }, { status: 400 })
  }

  try {
    const response = await fetch(`${baseUrl}api/${endpoint}`, {
      headers: {
        Authorization: `Token ${token}`,
        Accept: "application/json; version=2",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText)
      return NextResponse.json(
        { error: `Lookup fetch failed: ${message}` },
        { status: response.status },
      )
    }

    const payload = await response.json()
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lookup fetch failed" },
      { status: 500 },
    )
  }
}
