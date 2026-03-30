import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { AttributeUsage, ContextProfile, EntityUsage } from "@/lib/link-iq-types"
import { canManageConfig, mapPermissionBootstrapPayload } from "@/lib/permissions"

type MutationBody =
  | {
      action: "patch"
      description?: string
      document_type?: string
      label?: string
      source_id?: string
      source_scope?: string
      status?: string
      taxonomy_node_id?: string
    }
  | {
      action: "entity_upsert"
      index?: number
      usage: EntityUsage
    }
  | {
      action: "entity_delete"
      usage_id: string
    }
  | {
      action: "entity_reorder"
      target_index: number
      usage_id: string
    }
  | {
      action: "attribute_upsert"
      entity_usage_id: string
      index?: number
      usage: AttributeUsage
    }
  | {
      action: "attribute_delete"
      attribute_usage_id: string
      entity_usage_id: string
    }
  | {
      action: "attribute_reorder"
      attribute_usage_id: string
      entity_usage_id: string
      target_index: number
    }

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return false

  const uiSettings = await getUiSettings().catch(() => null)
  const permissions = mapPermissionBootstrapPayload(uiSettings)
  return canManageConfig(permissions)
}

function profileIdFromParams(params: { id: string }) {
  return String(params.id ?? "").trim()
}

function normalizeUsage(usage: EntityUsage | AttributeUsage) {
  return {
    ...usage,
    description: usage.description?.trim() || undefined,
    label: usage.label?.trim() || undefined,
    qualifier_ids: usage.qualifier_ids?.length ? usage.qualifier_ids : undefined,
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const resolvedParams = await params
  const profileID = profileIdFromParams(resolvedParams)
  if (!profileID) {
    return NextResponse.json({ error: "profile_id is required" }, { status: 400 })
  }

  try {
    const body = (await request.json()) as MutationBody
    let capability = ""
    let input: Record<string, unknown> = { profile_id: profileID }

    switch (body.action) {
      case "patch":
        capability = "context_profile.patch"
        input = {
          ...input,
          description: body.description,
          document_type: body.document_type,
          label: body.label,
          source_id: body.source_id,
          source_scope: body.source_scope,
          status: body.status,
          taxonomy_node_id: body.taxonomy_node_id,
        }
        break
      case "entity_upsert":
        capability = "context_profile.entity_upsert"
        input = {
          ...input,
          index: body.index,
          usage: {
            ...normalizeUsage(body.usage),
            attributes: body.usage.attributes?.map((attributeUsage) => normalizeUsage(attributeUsage)),
          },
        }
        break
      case "entity_delete":
        capability = "context_profile.entity_delete"
        input = {
          ...input,
          usage_id: body.usage_id,
        }
        break
      case "entity_reorder":
        capability = "context_profile.entity_reorder"
        input = {
          ...input,
          target_index: body.target_index,
          usage_id: body.usage_id,
        }
        break
      case "attribute_upsert":
        capability = "context_profile.attribute_upsert"
        input = {
          ...input,
          entity_usage_id: body.entity_usage_id,
          index: body.index,
          usage: normalizeUsage(body.usage),
        }
        break
      case "attribute_delete":
        capability = "context_profile.attribute_delete"
        input = {
          ...input,
          attribute_usage_id: body.attribute_usage_id,
          entity_usage_id: body.entity_usage_id,
        }
        break
      case "attribute_reorder":
        capability = "context_profile.attribute_reorder"
        input = {
          ...input,
          attribute_usage_id: body.attribute_usage_id,
          entity_usage_id: body.entity_usage_id,
          target_index: body.target_index,
        }
        break
      default:
        return NextResponse.json({ error: "Unsupported mutation action" }, { status: 400 })
    }

    const result = await invokeLinkIQAction<{ context_profile?: ContextProfile }>({
      capability,
      input,
      resource_id: profileID,
    })

    return NextResponse.json(result.context_profile ?? {})
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to mutate domain model",
      },
      { status: 500 }
    )
  }
}
