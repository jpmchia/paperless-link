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

function definitionIdFromParams(params: { id: string }) {
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
  const definitionID = definitionIdFromParams(resolvedParams)
  if (!definitionID) {
    return NextResponse.json(
      { error: "definition_id is required" },
      { status: 400 }
    )
  }

  try {
    await invokeLinkIQAction<{ deleted?: boolean }>({
      capability: "domain_model.delete_definition",
      resource_id: definitionID,
      input: {
        definition_id: definitionID,
      },
    })

    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete domain model",
      },
      { status: 500 }
    )
  }
}
