import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { invokeLinkIQAction, LINK_IQ_SOURCE_ID } from "@/lib/link-iq"

async function requireSession() {
  const session = await getServerSession(authOptions)
  return session ? true : false
}

function documentIdFromParams(params: { id: string }) {
  return String(params.id ?? "").trim()
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const resolvedParams = await params
  const documentId = documentIdFromParams(resolvedParams)
  const url = new URL(request.url)
  const sourceID = url.searchParams.get("source_id") || LINK_IQ_SOURCE_ID
  const documentType = url.searchParams.get("document_type") || ""

  try {
    const result = await invokeLinkIQAction<{ document_context?: unknown }>({
      capability: "document.resolve_context",
      source_id: sourceID,
      resource_id: documentId,
      input: {
        document_id: documentId,
        document_type: documentType,
        source_id: sourceID,
      },
    })

    return NextResponse.json(result.document_context ?? {})
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to resolve document context",
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const resolvedParams = await params
  const documentId = documentIdFromParams(resolvedParams)

  try {
    const body = (await request.json()) as {
      document_type?: string
      primary_taxonomy_node_id?: string
      source_id?: string
      taxonomy_node_ids?: string[]
    }

    const sourceID = body.source_id || LINK_IQ_SOURCE_ID
    await invokeLinkIQAction<{ assignments?: unknown[] }>({
      capability: "taxonomy.assignment.replace",
      source_id: sourceID,
      resource_id: documentId,
      input: {
        document_id: documentId,
        primary_taxonomy_node_id: body.primary_taxonomy_node_id,
        source_id: sourceID,
        taxonomy_node_ids: body.taxonomy_node_ids ?? [],
      },
    })

    const context = await invokeLinkIQAction<{ document_context?: unknown }>({
      capability: "document.resolve_context",
      source_id: sourceID,
      resource_id: documentId,
      input: {
        document_id: documentId,
        document_type: body.document_type ?? "",
        source_id: sourceID,
      },
    })

    return NextResponse.json(context.document_context ?? {})
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save document context",
      },
      { status: 500 }
    )
  }
}
