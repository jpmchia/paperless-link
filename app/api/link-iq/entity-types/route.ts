import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import { invokeLinkIQAction, LINK_IQ_SOURCE_ID } from "@/lib/link-iq"
import type { EntityType } from "@/lib/link-iq-types"
import { canManageConfig, mapPermissionBootstrapPayload } from "@/lib/permissions"

async function requireSession() {
  const session = await getServerSession(authOptions)
  return session ? true : false
}

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return false

  const uiSettings = await getUiSettings().catch(() => null)
  const permissions = mapPermissionBootstrapPayload(uiSettings)
  return canManageConfig(permissions)
}

function shouldIncludeScopedRecord(
  sourceScope: string | undefined,
  sourceID: string | undefined,
  activeSourceID: string
) {
  if (!sourceScope || sourceScope === "link_global") return true
  return sourceID === activeSourceID
}

export async function GET(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const sourceID = url.searchParams.get("source_id") || LINK_IQ_SOURCE_ID
    const includeAllScopes = url.searchParams.get("include_all_scopes") === "true"
    const status = url.searchParams.get("status")

    const result = await invokeLinkIQAction<{ entity_types?: EntityType[] }>({
      capability: "entity_type.list",
      input: {
        source_id: url.searchParams.get("source_id") || undefined,
        source_scope: url.searchParams.get("source_scope") || undefined,
        status: status && status !== "all" ? status : undefined,
      },
    })

    const entityTypes = (result.entity_types ?? []).filter((entityType) => {
      if (includeAllScopes) return true
      return shouldIncludeScopedRecord(
        entityType.source_scope,
        entityType.source_id,
        sourceID
      )
    })

    return NextResponse.json({ entity_types: entityTypes })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load entity types",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json()) as EntityType
    const sourceScope = String(body.source_scope || "link_global").trim()
    const normalizedSourceID =
      sourceScope === "link_global"
        ? ""
        : String(body.source_id || LINK_IQ_SOURCE_ID).trim()

    const result = await invokeLinkIQAction<{ entity_type?: EntityType }>({
      capability: "entity_type.upsert",
      input: {
        ...body,
        source_id: normalizedSourceID || undefined,
        source_scope: sourceScope,
      },
    })

    return NextResponse.json(result.entity_type ?? {})
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save entity type",
      },
      { status: 500 }
    )
  }
}
