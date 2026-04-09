import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { DataroomReleaseItem } from "@/lib/link-iq-types"
import { getPaperlessBaseUrl, resolvePaperlessToken, validateDataroomSession } from "../_shared"

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

    const releaseItems = await invokeLinkIQAction<{ items?: DataroomReleaseItem[] }>({
      capability: "dataroom.release.items",
      resource_id: dataroomID,
      input: { dataroom_id: dataroomID, status: "published" },
    })
    const allowed = (releaseItems.items ?? []).some((item) => Number(item.document_id) === documentID)
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
      headers: {
        Authorization: `Token ${paperlessToken}`,
        Accept: "*/*",
      },
      cache: "no-store",
    })
    if (!upstream.ok) {
      const message = await upstream.text().catch(() => upstream.statusText)
      return NextResponse.json(
        { error: message || "Failed to download document" },
        { status: upstream.status || 500 },
      )
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition":
          upstream.headers.get("Content-Disposition") || `attachment; filename="document-${documentID}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download dataroom document" },
      { status: 500 },
    )
  }
}

