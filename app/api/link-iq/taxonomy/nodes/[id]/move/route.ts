import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import { invokeLinkIQAction } from "@/lib/link-iq"
import { canManageConfig, mapPermissionBootstrapPayload } from "@/lib/permissions"

type MoveBody = {
  parent_node_id?: string
  sort_order?: number
}

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return false

  const uiSettings = await getUiSettings().catch(() => null)
  const permissions = mapPermissionBootstrapPayload(uiSettings)
  return canManageConfig(permissions)
}

function nodeIdFromParams(params: { id: string }) {
  return String(params.id ?? "").trim()
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const resolvedParams = await params
  const taxonomyNodeID = nodeIdFromParams(resolvedParams)
  if (!taxonomyNodeID) {
    return NextResponse.json(
      { error: "taxonomy_node_id is required" },
      { status: 400 }
    )
  }

  try {
    const body = (await request.json()) as MoveBody
    const result = await invokeLinkIQAction<{ node?: Record<string, unknown> }>({
      capability: "taxonomy.move_node",
      resource_id: taxonomyNodeID,
      input: {
        taxonomy_node_id: taxonomyNodeID,
        parent_node_id: body.parent_node_id || undefined,
        sort_order: body.sort_order,
      },
    })

    return NextResponse.json(result.node ?? {})
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to move taxonomy node",
      },
      { status: 500 }
    )
  }
}
