import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi, type PaginatedResults } from "@/lib/api"
import { invokeLinkIQAction, LINK_IQ_SOURCE_ID } from "@/lib/link-iq"
import type {
  ContextProfile,
  EntityType,
  Qualifier,
  TaxonomyNode,
} from "@/lib/link-iq-types"
import { requireRoutePermission } from "@/lib/server-permissions"
import { DomainModelsWorkbench } from "./domain-models-workbench"

type DocumentTypeOption =
  React.ComponentProps<typeof DomainModelsWorkbench>["initialDocumentTypes"][number]

function filterScopedRecords<T extends { source_id?: string; source_scope?: string }>(
  records: T[],
  sourceID: string
) {
  return records.filter((record) => {
    if (!record.source_scope || record.source_scope === "link_global") {
      return true
    }
    return record.source_id === sourceID
  })
}

async function getContextProfiles() {
  try {
    const result = await invokeLinkIQAction<{
      context_profiles?: ContextProfile[]
    }>({
      capability: "context_profile.list",
    })

    return filterScopedRecords(result.context_profiles ?? [], LINK_IQ_SOURCE_ID)
  } catch {
    return []
  }
}

async function getTaxonomyNodes() {
  try {
    const result = await invokeLinkIQAction<{ nodes?: TaxonomyNode[] }>({
      capability: "taxonomy.list",
      input: {
        status: "active",
      },
    })

    return filterScopedRecords(result.nodes ?? [], LINK_IQ_SOURCE_ID).sort((left, right) =>
      left.path.localeCompare(right.path)
    )
  } catch {
    return []
  }
}

async function getEntityTypes() {
  try {
    const result = await invokeLinkIQAction<{ entity_types?: EntityType[] }>({
      capability: "entity_type.list",
      input: {
        status: "active",
      },
    })

    return filterScopedRecords(result.entity_types ?? [], LINK_IQ_SOURCE_ID)
  } catch {
    return []
  }
}

async function getQualifiers() {
  try {
    const result = await invokeLinkIQAction<{ qualifiers?: Qualifier[] }>({
      capability: "qualifier.list",
      input: {
        status: "active",
      },
    })

    return filterScopedRecords(result.qualifiers ?? [], LINK_IQ_SOURCE_ID)
  } catch {
    return []
  }
}

async function getDocumentTypes() {
  try {
    const data = await getPaperlessApi<PaginatedResults<DocumentTypeOption>>(
      "document_types/?page_size=100000"
    )
    return (data.results ?? []).sort((left, right) => left.name.localeCompare(right.name))
  } catch {
    return []
  }
}

export default async function DomainModelsPage() {
  const permissions = await requireRoutePermission("/domain-models")
  const [contextProfiles, taxonomyNodes, documentTypes, entityTypes, qualifiers] =
    await Promise.all([
      getContextProfiles(),
      getTaxonomyNodes(),
      getDocumentTypes(),
      getEntityTypes(),
      getQualifiers(),
    ])

  return (
    <AppShell
      initialPermissions={permissions}
      topbar={<TopBar title="Domain Models" />}
    >
      <DomainModelsWorkbench
        initialContextProfiles={contextProfiles}
        initialTaxonomyNodes={taxonomyNodes}
        initialDocumentTypes={documentTypes}
        initialEntityTypes={entityTypes}
        initialQualifiers={qualifiers}
        sourceID={LINK_IQ_SOURCE_ID}
      />
    </AppShell>
  )
}
