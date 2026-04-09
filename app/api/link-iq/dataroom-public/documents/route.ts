import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { DataroomReleaseItem } from "@/lib/link-iq-types"
import { getPaperlessBaseUrl, resolvePaperlessToken, validateDataroomSession } from "./_shared"

type DocumentsInput = {
  token?: string
  slug?: string
}

type PaperlessDocument = {
  id: number
  title?: string
  created?: string
  added?: string
  modified?: string
  correspondent?: number | null
  document_type?: number | null
  storage_path?: number | null
  tags?: number[]
  page_count?: number | null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DocumentsInput
    if (!body.token?.trim() || !body.slug?.trim()) {
      return NextResponse.json({ error: "token and slug are required" }, { status: 400 })
    }
    const validatedRequest = new Request(request.url, {
      method: "GET",
      headers: request.headers,
    })
    const validatedURL = new URL(validatedRequest.url)
    validatedURL.searchParams.set("token", body.token.trim())
    validatedURL.searchParams.set("slug", body.slug.trim())
    const session = await validateDataroomSession(new Request(validatedURL.toString(), { method: "GET" }))
    const { dataroomID } = session

    const releaseItems = await invokeLinkIQAction<{ items?: DataroomReleaseItem[] }>({
      capability: "dataroom.release.items",
      resource_id: dataroomID,
      input: { dataroom_id: dataroomID, status: "published" },
    })

    const documentIDs = Array.from(
      new Set((releaseItems.items ?? []).map((item) => Number(item.document_id)).filter(Number.isFinite)),
    )
    if (documentIDs.length === 0) {
      return NextResponse.json({ documents: [] })
    }

    const paperlessToken = resolvePaperlessToken(session)
    if (!paperlessToken) {
      return NextResponse.json(
        { error: "No Paperless token configured for this dataroom" },
        { status: 500 },
      )
    }

    const baseUrl = getPaperlessBaseUrl()
    const documents = (
      await Promise.all(
        documentIDs.map(async (id) => {
          const response = await fetch(`${baseUrl}api/documents/${id}/`, {
            headers: {
              Authorization: `Token ${paperlessToken}`,
              Accept: "application/json; version=2",
            },
            cache: "no-store",
          })
          if (!response.ok) return null
          return (await response.json()) as PaperlessDocument
        }),
      )
    ).filter((item): item is PaperlessDocument => Boolean(item))

    return NextResponse.json({
      documents: documents.sort((left, right) => (left.title || "").localeCompare(right.title || "")),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dataroom documents" },
      { status: 500 },
    )
  }
}

