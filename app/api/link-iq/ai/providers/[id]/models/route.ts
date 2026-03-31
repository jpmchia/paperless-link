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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const result = await invokeLinkIQAction<{ models?: unknown[] }>({
      capability: "ai.provider.fetch_models",
      input: { provider_id: id },
      resource_id: id,
    })

    return NextResponse.json({ models: result.models ?? [] })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve provider models",
      },
      { status: 500 }
    )
  }
}
