import { invokeLinkIQAction } from "@/lib/link-iq"
import type { Qualifier } from "@/lib/link-iq-types"

const TAXONOMY_NODE_TYPE_PREFIX = "system.taxonomy-node-type:"

function normalizeNodeTypes(values: unknown): string[] {
  if (!Array.isArray(values)) return []

  const seen = new Set<string>()
  const normalized: string[] = []

  for (const value of values) {
    if (typeof value !== "string") continue

    const trimmed = value.trim()
    if (!trimmed) continue

    const dedupeKey = trimmed.toLocaleLowerCase()
    if (seen.has(dedupeKey)) continue

    seen.add(dedupeKey)
    normalized.push(trimmed)
  }

  return normalized
}

function slugify(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function taxonomyNodeTypeQualifierId(label: string, index: number) {
  const position = String(index + 1).padStart(4, "0")
  const slug = slugify(label) || `type-${position}`
  return `${TAXONOMY_NODE_TYPE_PREFIX}${position}:${slug}`
}

export function isManagedTaxonomyNodeTypeQualifier(
  qualifier: Pick<Qualifier, "qualifier_id">
) {
  return qualifier.qualifier_id.startsWith(TAXONOMY_NODE_TYPE_PREFIX)
}

function compareManagedQualifiers(left: Qualifier, right: Qualifier) {
  return left.qualifier_id.localeCompare(right.qualifier_id)
}

export async function listTaxonomyNodeTypes(): Promise<string[]> {
  const result = await invokeLinkIQAction<{ qualifiers?: Qualifier[] }>({
    capability: "qualifier.list",
    input: {
      status: "active",
    },
  })

  return (result.qualifiers ?? [])
    .filter(isManagedTaxonomyNodeTypeQualifier)
    .sort(compareManagedQualifiers)
    .map((qualifier) => qualifier.label.trim())
    .filter(Boolean)
}

export async function saveTaxonomyNodeTypes(
  nodeTypes: string[]
): Promise<string[]> {
  const normalizedNodeTypes = normalizeNodeTypes(nodeTypes)

  const existing = await invokeLinkIQAction<{ qualifiers?: Qualifier[] }>({
    capability: "qualifier.list",
    input: {
      status: "all",
    },
  })

  const existingManagedQualifiers = (existing.qualifiers ?? []).filter(
    isManagedTaxonomyNodeTypeQualifier
  )

  const desiredIDs = new Set<string>()

  for (const [index, label] of normalizedNodeTypes.entries()) {
    const qualifierID = taxonomyNodeTypeQualifierId(label, index)
    desiredIDs.add(qualifierID)

    await invokeLinkIQAction({
      capability: "qualifier.upsert",
      input: {
        qualifier_id: qualifierID,
        label,
        name: slugify(label) || `type-${index + 1}`,
        description: "System-managed taxonomy node type option.",
        source_scope: "link_global",
        status: "active",
      },
    })
  }

  for (const qualifier of existingManagedQualifiers) {
    if (desiredIDs.has(qualifier.qualifier_id)) continue
    if (qualifier.status === "inactive") continue

    await invokeLinkIQAction({
      capability: "qualifier.upsert",
      input: {
        qualifier_id: qualifier.qualifier_id,
        label: qualifier.label,
        name: qualifier.name,
        description: qualifier.description,
        source_id: qualifier.source_id,
        source_scope: qualifier.source_scope || "link_global",
        status: "inactive",
      },
    })
  }

  return normalizedNodeTypes
}
