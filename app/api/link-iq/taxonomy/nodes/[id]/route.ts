import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import { invokeLinkIQAction } from "@/lib/link-iq"
import { canManageConfig, mapPermissionBootstrapPayload } from "@/lib/permissions"

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
    console.error("Failed to sync generated business context fields after taxonomy delete:", error)
  }
}

function nodeIdFromParams(params: { id: string }) {
  return String(params.id ?? "").trim()
}

export async function DELETE(
  _request: Request,
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
    await invokeLinkIQAction<{ deleted?: boolean }>({
      capability: "taxonomy.delete_node",
      resource_id: taxonomyNodeID,
      input: {
        taxonomy_node_id: taxonomyNodeID,
      },
    })

    await syncGeneratedBusinessContext()

    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete taxonomy node",
      },
      { status: 500 }
    )
  }
}
