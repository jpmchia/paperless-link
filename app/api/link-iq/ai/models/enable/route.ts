import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { AIModel } from "@/lib/link-iq-types"
import { canManageConfig, mapPermissionBootstrapPayload } from "@/lib/permissions"

type AdminSession = {
  user?: {
    name?: string | null
  } | null
}

async function requireAdmin() {
  const session = (await getServerSession(authOptions)) as AdminSession | null
  if (!session) return { allowed: false as const, session: null }

  const uiSettings = await getUiSettings().catch(() => null)
  const permissions = mapPermissionBootstrapPayload(uiSettings)
  return {
    allowed: canManageConfig(permissions),
    session,
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json()) as { provider_id?: string; catalog_id?: string }
    const actor = auth.session?.user?.name?.trim() || "unknown"
    const result = await invokeLinkIQAction<{ model?: AIModel }>({
      capability: "ai.model.enable_from_catalog",
      input: {
        provider_id: body.provider_id,
        catalog_id: body.catalog_id,
        changed_by_user_id: actor,
        changed_by_username: actor,
      },
    })

    return NextResponse.json(result.model ?? {})
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to enable AI model" },
      { status: 500 }
    )
  }
}
