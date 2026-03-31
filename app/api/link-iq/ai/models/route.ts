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

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const result = await invokeLinkIQAction<{ models?: AIModel[] }>({
      capability: "ai.model.list",
      input: {
        provider_id: url.searchParams.get("provider_id") || undefined,
      },
    })

    return NextResponse.json({ models: result.models ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load AI models" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json()) as AIModel
    const actor = auth.session?.user?.name?.trim() || "unknown"
    const result = await invokeLinkIQAction<{ model?: AIModel }>({
      capability: "ai.model.upsert",
      input: {
        ...(body as unknown as Record<string, unknown>),
        changed_by_user_id: actor,
        changed_by_username: actor,
      },
    })

    return NextResponse.json(result.model ?? {})
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save AI model" },
      { status: 500 }
    )
  }
}
