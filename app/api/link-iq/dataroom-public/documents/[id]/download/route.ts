import { NextResponse } from "next/server"
import { isDocumentAccessibleInDataroomViewer } from "../../document-access"
import {
  buildPaperlessDownloadRequestHeaders,
  passthroughStreamingHeaders,
} from "../../pdf-upstream"
import { getPaperlessBaseUrl, resolvePaperlessToken, validateDataroomSession } from "../../_shared"

type RouteParams = { params: Promise<{ id: string }> }

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const documentID = Number(id)
    if (!Number.isFinite(documentID)) {
      return NextResponse.json({ error: "Invalid document id" }, { status: 400 })
    }

    const session = await validateDataroomSession(request)
    const { dataroomID } = session
    const url = new URL(request.url)
    const folderId = url.searchParams.get("folder_id")?.trim() || undefined

    const allowed = await isDocumentAccessibleInDataroomViewer({
      dataroomID,
      documentID,
      folderId,
      session,
    })
    if (!allowed) {
      return NextResponse.json({ error: "Document not available in this dataroom" }, { status: 403 })
    }

    const paperlessToken = resolvePaperlessToken(session)
    if (!paperlessToken) {
      return NextResponse.json(
        { error: "No Paperless token configured for this dataroom" },
        { status: 500 },
      )
    }

    const upstream = await fetch(`${getPaperlessBaseUrl()}api/documents/${documentID}/download/`, {
      headers: buildPaperlessDownloadRequestHeaders(paperlessToken, request),
      cache: "no-store",
    })
    if (!upstream.ok) {
      const message = await upstream.text().catch(() => upstream.statusText)
      return NextResponse.json(
        { error: message || "Failed to download document" },
        { status: upstream.status || 500 },
      )
    }

    const headers = passthroughStreamingHeaders(upstream)
    const ct = upstream.headers.get("Content-Type") || "application/octet-stream"
    headers.set("Content-Type", ct)
    const cd =
      upstream.headers.get("Content-Disposition") || `attachment; filename="document-${documentID}.pdf"`
    headers.set("Content-Disposition", cd)

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download dataroom document" },
      { status: 500 },
    )
  }
}

