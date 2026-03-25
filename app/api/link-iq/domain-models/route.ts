import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import { invokeLinkIQAction, LINK_IQ_SOURCE_ID } from "@/lib/link-iq"
import { canManageConfig, mapPermissionBootstrapPayload } from "@/lib/permissions"

type DomainModelEntity = {
  attributes?: Array<{
    attribute_id?: string
    description?: string
    label?: string
    name?: string
    required?: boolean
    value_type?: string
  }>
  cardinality?: string
  description?: string
  entity_type?: string
  label?: string
  required?: boolean
}

type DomainModelDefinition = {
  created_at?: string
  definition_id?: string
  description?: string
  document_type?: string
  entities?: DomainModelEntity[]
  label?: string
  source_id?: string
  source_scope?: string
  status?: string
  taxonomy_node_id?: string
  updated_at?: string
  version?: number
}

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

  const url = new URL(request.url)
  const sourceID = url.searchParams.get("source_id") || LINK_IQ_SOURCE_ID
  const status = url.searchParams.get("status")
  const includeAllScopes = url.searchParams.get("include_all_scopes") === "true"

  try {
    const result = await invokeLinkIQAction<{
      definitions?: DomainModelDefinition[]
    }>({
      capability: "domain_model.list",
      input: {
        document_type: url.searchParams.get("document_type") || undefined,
        source_id: url.searchParams.get("source_id") || undefined,
        source_scope: url.searchParams.get("source_scope") || undefined,
        status: status && status !== "all" ? status : undefined,
        taxonomy_node_id: url.searchParams.get("taxonomy_node_id") || undefined,
      },
    })

    const definitions = (result.definitions ?? []).filter((definition) => {
      if (includeAllScopes) return true
      return shouldIncludeScopedRecord(
        definition.source_scope,
        definition.source_id,
        sourceID
      )
    })

    return NextResponse.json({ definitions })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load domain models",
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
    const body = (await request.json()) as DomainModelDefinition
    const sourceScope = String(body.source_scope || "link_global").trim()
    const normalizedSourceID =
      sourceScope === "link_global"
        ? ""
        : String(body.source_id || LINK_IQ_SOURCE_ID).trim()

    const result = await invokeLinkIQAction<{
      definition?: DomainModelDefinition
    }>({
      capability: "domain_model.upsert_definition",
      input: {
        ...body,
        source_id: normalizedSourceID || undefined,
        source_scope: sourceScope,
      },
    })

    return NextResponse.json(result.definition ?? {})
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save domain model",
      },
      { status: 500 }
    )
  }
}
