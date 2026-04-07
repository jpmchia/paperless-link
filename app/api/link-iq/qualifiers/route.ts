import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { invokeLinkIQAction, LINK_IQ_SOURCE_ID } from "@/lib/link-iq"
import type { Qualifier } from "@/lib/link-iq-types"
import { isManagedTaxonomyNodeTypeQualifier } from "@/lib/taxonomy-node-types"

async function requireSession() {
  const session = await getServerSession(authOptions)
  return session ? true : false
}

function shouldIncludeScopedRecord(
  sourceScope: string | undefined,
  sourceID: string | undefined,
  activeSourceID: string
) {
  if (!sourceScope || sourceScope === "link_global") return true
  return sourceID === activeSourceID
}

export async function GET(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const sourceID = url.searchParams.get("source_id") || LINK_IQ_SOURCE_ID
    const includeAllScopes =
      url.searchParams.get("include_all_scopes") === "true"
    const status = url.searchParams.get("status")

    const result = await invokeLinkIQAction<{ qualifiers?: Qualifier[] }>({
      capability: "qualifier.list",
      input: {
        source_id: url.searchParams.get("source_id") || undefined,
        source_scope: url.searchParams.get("source_scope") || undefined,
        status: status && status !== "all" ? status : undefined,
      },
    })

    const qualifiers = (result.qualifiers ?? []).filter((qualifier) => {
      if (isManagedTaxonomyNodeTypeQualifier(qualifier)) return false
      if (includeAllScopes) return true
      return shouldIncludeScopedRecord(
        qualifier.source_scope,
        qualifier.source_id,
        sourceID
      )
    })

    return NextResponse.json({ qualifiers })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load qualifiers",
      },
      { status: 500 }
    )
  }
}
