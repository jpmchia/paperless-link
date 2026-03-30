import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { ContextField } from "@/lib/link-iq-types"
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
    const result = await invokeLinkIQAction<{ fields?: ContextField[] }>({
      capability: "context_field.list",
      input: {
        scope: url.searchParams.get("scope") || undefined,
        section: url.searchParams.get("section") || undefined,
        status: url.searchParams.get("status") || undefined,
      },
    })

    return NextResponse.json({ fields: result.fields ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load context fields" },
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
    const body = (await request.json()) as ContextField
    const actor = auth.session?.user?.name?.trim() || "unknown"
    const result = await invokeLinkIQAction<{ field?: ContextField }>({
      capability: "context_field.upsert",
      input: {
        ...(body as unknown as Record<string, unknown>),
        changed_by_user_id: actor,
        changed_by_username: actor,
      },
    })

    return NextResponse.json(result.field ?? {})
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save context field" },
      { status: 500 }
    )
  }
}
