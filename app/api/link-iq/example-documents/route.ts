import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { invokeLinkIQAction, LINK_IQ_SOURCE_ID } from "@/lib/link-iq"
import type { ExampleDocument } from "@/lib/link-iq-types"

async function requireSession() {
  const session = await getServerSession(authOptions)
  return session ? true : false
}

export async function GET(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const sourceID = url.searchParams.get("source_id") || LINK_IQ_SOURCE_ID
    const documentID = url.searchParams.get("document_id")

    if (documentID) {
      const result = await invokeLinkIQAction<{ document?: ExampleDocument }>({
        capability: "example_document.fetch",
        resource_id: documentID,
        source_id: sourceID,
        input: {
          document_id: documentID,
          source_id: sourceID,
        },
      })

      return NextResponse.json({ document: result.document ?? null })
    }

    const listResult = await invokeLinkIQAction<{ documents?: ExampleDocument[] }>({
      capability: "example_document.list",
      source_id: sourceID,
      input: {
        source_id: sourceID,
        taxonomy_node_id: url.searchParams.get("taxonomy_node_id") || undefined,
        document_type: url.searchParams.get("document_type") || undefined,
        query: url.searchParams.get("query") || undefined,
        limit: Number(url.searchParams.get("limit") || "8"),
      },
    })

    return NextResponse.json({ documents: listResult.documents ?? [] })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load example documents",
      },
      { status: 500 }
    )
  }
}
