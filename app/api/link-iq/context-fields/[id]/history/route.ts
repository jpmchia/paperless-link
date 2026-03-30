import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import { invokeLinkIQAction } from "@/lib/link-iq"
import { canManageConfig, mapPermissionBootstrapPayload } from "@/lib/permissions"
import type { ContextFieldHistoryEntry } from "@/lib/link-iq-types"

type AdminSession = {
  user?: {
    name?: string | null
  } | null
}

async function requireAdmin() {
  const session = (await getServerSession(authOptions)) as AdminSession | null
  if (!session) return false

  const uiSettings = await getUiSettings().catch(() => null)
  const permissions = mapPermissionBootstrapPayload(uiSettings)
  return canManageConfig(permissions)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const url = new URL(request.url)
    const result = await invokeLinkIQAction<{ history?: ContextFieldHistoryEntry[] }>({
      capability: "context_field.history",
      resource_id: id,
      input: {
        field_id: id,
        limit: Number(url.searchParams.get("limit") || "100"),
      },
    })

    return NextResponse.json({ history: result.history ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load context field history" },
      { status: 500 }
    )
  }
}
