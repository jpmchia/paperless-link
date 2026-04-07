import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import { invokeLinkIQAction, LINK_IQ_SOURCE_ID } from "@/lib/link-iq"
import {
  canManageConfig,
  mapPermissionBootstrapPayload,
} from "@/lib/permissions"

type TaxonomyNode = {
  created_at?: string
  depth?: number
  description?: string
  label?: string
  mapping_state?: string
  node_type?: string
  parent_node_id?: string
  path?: string
  sort_order?: number
  source_id?: string
  source_scope?: string
  status?: string
  taxonomy_node_id?: string
  updated_at?: string
}

function hasTaxonomyNodeID(
  node: TaxonomyNode
): node is TaxonomyNode & { taxonomy_node_id: string } {
  return (
    typeof node.taxonomy_node_id === "string" &&
    node.taxonomy_node_id.length > 0
  )
}

async function requireSession() {
  const session = await getServerSession(authOptions)
  return session ? true : false
}

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return false

  const uiSettings = await getUiSettings().catch(() => null)
  const permissions = mapPermissionBootstrapPayload(uiSettings)
  return canManageConfig(permissions)
}

async function syncGeneratedBusinessContext() {
  try {
    await invokeLinkIQAction<{ updated_count?: number }>({
      capability: "context_field.sync_dynamic",
    })
  } catch (error) {
    console.error(
      "Failed to sync generated business context fields after taxonomy save:",
      error
    )
  }
}

export async function GET(request: Request) {
  return handleGet(request)
}

async function handleGet(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const sourceID = url.searchParams.get("source_id") || LINK_IQ_SOURCE_ID
    const status = url.searchParams.get("status")
    const includeAllScopes =
      url.searchParams.get("include_all_scopes") === "true"
    const result = await invokeLinkIQAction<{ nodes?: TaxonomyNode[] }>({
      capability: "taxonomy.list",
      input: {
        parent_node_id: url.searchParams.get("parent_node_id") || undefined,
        source_id: url.searchParams.get("source_id") || undefined,
        source_scope: url.searchParams.get("source_scope") || undefined,
        status: status && status !== "all" ? status : "active",
      },
    })

    const nodes = (result.nodes ?? []).filter(
      (node): node is TaxonomyNode & { taxonomy_node_id: string } => {
        if (!hasTaxonomyNodeID(node)) return false
        if (includeAllScopes) return true
        if (node.source_scope === "link_global" || !node.source_scope)
          return true
        return node.source_id === sourceID
      }
    )

    return NextResponse.json({
      nodes,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load taxonomy nodes",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json()) as TaxonomyNode
    const sourceScope = String(body.source_scope || "link_global").trim()
    const normalizedSourceID =
      sourceScope === "link_global"
        ? ""
        : String(body.source_id || LINK_IQ_SOURCE_ID).trim()
    const normalizedNodeType = body.node_type?.trim() || undefined

    const result = await invokeLinkIQAction<{ node?: TaxonomyNode }>({
      capability: "taxonomy.upsert_node",
      input: {
        ...body,
        node_type: normalizedNodeType,
        source_id: normalizedSourceID || undefined,
        source_scope: sourceScope,
      },
    })

    const savedNode =
      result.node ??
      ({
        ...body,
        node_type: normalizedNodeType,
        source_id: normalizedSourceID || undefined,
        source_scope: sourceScope,
      } as TaxonomyNode)

    const taxonomyNodeID = savedNode.taxonomy_node_id?.trim()
    await syncGeneratedBusinessContext()

    return NextResponse.json({
      ...savedNode,
      taxonomy_node_id: taxonomyNodeID || undefined,
      node_type: savedNode.node_type?.trim() || normalizedNodeType,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save taxonomy node",
      },
      { status: 500 }
    )
  }
}
