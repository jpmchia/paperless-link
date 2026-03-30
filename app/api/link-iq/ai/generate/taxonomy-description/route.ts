import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { AIGeneratedTextResult } from "@/lib/link-iq-types"
import { canManageConfig, mapPermissionBootstrapPayload } from "@/lib/permissions"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return false

  const uiSettings = await getUiSettings().catch(() => null)
  const permissions = mapPermissionBootstrapPayload(uiSettings)
  return canManageConfig(permissions)
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json()) as {
      existing_description?: string
      label?: string
      parent_path?: string
      path_preview?: string
      source_id?: string
      source_scope?: string
    }

    const result = await invokeLinkIQAction<{ generation?: AIGeneratedTextResult }>({
      capability: "ai.process.run",
      input: {
        process_key: "taxonomy.description",
        variables: {
          existing_description: body.existing_description || "",
          label: body.label || "",
          parent_path: body.parent_path || "",
          path_preview: body.path_preview || "",
          source_id: body.source_id || "",
          source_scope: body.source_scope || "link_global",
        },
      },
    })

    return NextResponse.json(result.generation ?? {})
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate taxonomy description",
      },
      { status: 500 }
    )
  }
}
