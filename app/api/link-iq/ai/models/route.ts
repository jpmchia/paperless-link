import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import {
  allowsExistingDuplicateLabel,
  findDuplicateModelLabel,
} from "@/lib/ai-models"
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
    const existingModelsResult = await invokeLinkIQAction<{ models?: AIModel[] }>({
      capability: "ai.model.list",
      input: {
        provider_id: body.provider_id || undefined,
      },
    })
    const enabledModels = (existingModelsResult.models ?? []).filter(
      (model) => model.status !== "inactive"
    )
    const duplicate = findDuplicateModelLabel(
      enabledModels,
      body.provider_id,
      body.label,
      body.model_id
    )
    const persistedModel =
      body.model_id
        ? enabledModels.find(
            (model) => model.model_id === body.model_id
          ) ?? null
        : null
    if (duplicate && !allowsExistingDuplicateLabel(persistedModel, body.label)) {
      return NextResponse.json(
        {
          error: `Model labels must be unique within a provider. "${duplicate.label}" already exists.`,
        },
        { status: 400 }
      )
    }

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
