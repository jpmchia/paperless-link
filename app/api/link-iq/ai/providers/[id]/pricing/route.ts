import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import { invokeLinkIQAction } from "@/lib/link-iq"
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as { force?: boolean }
    const actor = auth.session?.user?.name?.trim() || "unknown"
    const result = await invokeLinkIQAction<{ updated_count?: number }>({
      capability: "ai.provider.refresh_model_pricing",
      input: {
        provider_id: id,
        force: body.force ?? true,
        changed_by_user_id: actor,
        changed_by_username: actor,
      },
      resource_id: id,
    })

    return NextResponse.json({ updated_count: result.updated_count ?? 0 })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to refresh model pricing",
      },
      { status: 500 }
    )
  }
}
