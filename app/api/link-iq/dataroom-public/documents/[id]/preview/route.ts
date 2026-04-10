import { NextResponse } from "next/server"
import { isDocumentAccessibleInDataroomViewer } from "../../document-access"
import { buildPaperlessPreviewRequestHeaders, passthroughPreviewBodyHeaders } from "../../pdf-upstream"
import { getCachedPreviewAuth, setCachedPreviewAuth } from "../../preview-auth-cache"
import { getPaperlessBaseUrl, resolvePaperlessToken, validateDataroomSession } from "../../_shared"
import type { ValidatedSession } from "../../_shared"

type RouteParams = { params: Promise<{ id: string }> }

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const documentID = Number(id)
    if (!Number.isFinite(documentID)) {
      return NextResponse.json({ error: "Invalid document id" }, { status: 400 })
    }

    const url = new URL(request.url)
    const token = (url.searchParams.get("token") || "").trim()
    const slug = (url.searchParams.get("slug") || "").trim()
    const folderId = url.searchParams.get("folder_id")?.trim() || undefined

    let session: ValidatedSession
    const hasRange = Boolean(request.headers.get("Range")?.trim())
    const cachedDataroomID =
      hasRange && token && slug ? getCachedPreviewAuth(token, slug, folderId, documentID) : null

    if (cachedDataroomID) {
      session = { token, slug, dataroomID: cachedDataroomID }
    } else {
      session = await validateDataroomSession(request)
      const allowed = await isDocumentAccessibleInDataroomViewer({
        dataroomID: session.dataroomID,
        documentID,
        folderId,
        session,
      })
      if (!allowed) {
        return NextResponse.json({ error: "Document not available in this dataroom" }, { status: 403 })
      }
      setCachedPreviewAuth(token, slug, folderId, documentID, session.dataroomID)
    }

    const paperlessToken = resolvePaperlessToken(session)
    if (!paperlessToken) {
      return NextResponse.json(
        { error: "No Paperless token configured for this dataroom" },
        { status: 500 },
      )
    }

    const upstream = await fetch(`${getPaperlessBaseUrl()}api/documents/${documentID}/preview/`, {
      headers: buildPaperlessPreviewRequestHeaders(paperlessToken),
      cache: "no-store",
    })
    if (!upstream.ok) {
      const message = await upstream.text().catch(() => upstream.statusText)
      return NextResponse.json(
        { error: message || "Failed to load PDF preview" },
        { status: upstream.status || 500 },
      )
    }

    const headers = passthroughPreviewBodyHeaders(upstream)

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dataroom document preview" },
      { status: 500 },
    )
  }
}

