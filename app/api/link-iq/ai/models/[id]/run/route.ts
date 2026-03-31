import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { AIModelRunResult } from "@/lib/link-iq-types"
import { canManageConfig, mapPermissionBootstrapPayload } from "@/lib/permissions"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return false

  const uiSettings = await getUiSettings().catch(() => null)
  const permissions = mapPermissionBootstrapPayload(uiSettings)
  return canManageConfig(permissions)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = (await request.json()) as { prompt?: string }

    const result = await invokeLinkIQAction<{ generation?: AIModelRunResult }>({
      capability: "ai.model.run",
      resource_id: id,
      input: {
        model_id: id,
        prompt: body.prompt || "",
      },
    })

    return NextResponse.json(result.generation ?? {})
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to run model test",
      },
      { status: 500 }
    )
  }
}
