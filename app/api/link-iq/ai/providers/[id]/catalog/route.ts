import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { AIProviderModelCatalogEntry } from "@/lib/link-iq-types"
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
    const result = await invokeLinkIQAction<{
      enabled?: AIProviderModelCatalogEntry[]
      available?: AIProviderModelCatalogEntry[]
    }>({
      capability: "ai.provider.list_model_catalog",
      input: { provider_id: id },
      resource_id: id,
    })

    return NextResponse.json({
      enabled: result.enabled ?? [],
      available: result.available ?? [],
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load provider model catalog",
      },
      { status: 500 }
    )
  }
}
