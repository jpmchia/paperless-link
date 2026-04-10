import { NextResponse } from "next/server"
import { isDocumentAccessibleInDataroomViewer } from "../../document-access"
import { getPaperlessBaseUrl, resolvePaperlessToken, validateDataroomSession } from "../../_shared"

type RouteParams = { params: Promise<{ id: string }> }

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

    const upstream = await fetch(`${getPaperlessBaseUrl()}api/documents/${documentID}/preview/`, {
      headers: {
        Authorization: `Token ${paperlessToken}`,
        Accept: "application/pdf",
      },
      cache: "no-store",
    })
    if (!upstream.ok) {
      const message = await upstream.text().catch(() => upstream.statusText)
      return NextResponse.json(
        { error: message || "Failed to load PDF preview" },
        { status: upstream.status || 500 },
      )
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/pdf",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dataroom document preview" },
      { status: 500 },
    )
  }
}

