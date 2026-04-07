import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import { buildAIProcessUpsertInput } from "@/lib/ai-processes"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { AIProcessConfig, ContextField } from "@/lib/link-iq-types"
import { canManageConfig, mapPermissionBootstrapPayload } from "@/lib/permissions"

const BUSINESS_CONTEXT_SECTION = "business_context"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return false

  const uiSettings = await getUiSettings().catch(() => null)
  const permissions = mapPermissionBootstrapPayload(uiSettings)
  return canManageConfig(permissions)
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const result = await invokeLinkIQAction<{ processes?: AIProcessConfig[] }>({
      capability: "ai.process.list",
      input: {
        section: url.searchParams.get("section") || undefined,
      },
    })

    return NextResponse.json({ processes: result.processes ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load AI processes" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json()) as AIProcessConfig
    const businessContextResult = await invokeLinkIQAction<{
      fields?: ContextField[]
    }>({
      capability: "context_field.list",
      input: {
        section: BUSINESS_CONTEXT_SECTION,
        status: "active",
      },
    }).catch(() => ({ fields: [] }))

    const result = await invokeLinkIQAction<{ process?: AIProcessConfig }>({
      capability: "ai.process.upsert",
      input: buildAIProcessUpsertInput(
        body,
        businessContextResult.fields ?? []
      ),
    })

    return NextResponse.json(result.process ?? {})
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save AI process" },
      { status: 500 }
    )
  }
}
