import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import { invokeLinkIQAction } from "@/lib/link-iq"
import { canManageConfig, mapPermissionBootstrapPayload } from "@/lib/permissions"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return false

  const uiSettings = await getUiSettings().catch(() => null)
  const permissions = mapPermissionBootstrapPayload(uiSettings)
  return canManageConfig(permissions)
}

function entityTypeIdFromParams(params: { id: string }) {
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
  const entityTypeID = entityTypeIdFromParams(resolvedParams)
  if (!entityTypeID) {
    return NextResponse.json(
      { error: "entity_type_id is required" },
      { status: 400 }
    )
  }

  try {
    await invokeLinkIQAction<{ deleted?: boolean }>({
      capability: "entity_type.delete",
      resource_id: entityTypeID,
      input: {
        entity_type_id: entityTypeID,
      },
    })

    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete entity type",
      },
      { status: 500 }
    )
  }
}
