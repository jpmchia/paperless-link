import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi, type PaginatedResults } from "@/lib/api"
import { invokeLinkIQAction, LINK_IQ_SOURCE_ID } from "@/lib/link-iq"
import { requireRoutePermission } from "@/lib/server-permissions"
import { DomainModelsWorkbench } from "./domain-models-workbench"

type DomainModelDefinition =
  React.ComponentProps<typeof DomainModelsWorkbench>["initialDefinitions"][number]
type TaxonomyNode =
  React.ComponentProps<typeof DomainModelsWorkbench>["initialTaxonomyNodes"][number]
type DocumentTypeOption =
  React.ComponentProps<typeof DomainModelsWorkbench>["initialDocumentTypes"][number]

function filterScopedDefinitions(
  definitions: DomainModelDefinition[],
  sourceID: string
) {
  return definitions.filter((definition) => {
    if (!definition.source_scope || definition.source_scope === "link_global") {
      return true
    }
    return definition.source_id === sourceID
  })
}

function filterScopedNodes(nodes: TaxonomyNode[], sourceID: string) {
  return nodes.filter((node) => {
    if (!node.source_scope || node.source_scope === "link_global") return true
    return node.source_id === sourceID
  })
}

async function getDomainModelDefinitions() {
  try {
    const result = await invokeLinkIQAction<{
      definitions?: DomainModelDefinition[]
    }>({
      capability: "domain_model.list",
    })

    return filterScopedDefinitions(result.definitions ?? [], LINK_IQ_SOURCE_ID)
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

    return filterScopedNodes(result.nodes ?? [], LINK_IQ_SOURCE_ID).sort((left, right) =>
      left.path.localeCompare(right.path)
    )
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
  const [definitions, taxonomyNodes, documentTypes] = await Promise.all([
    getDomainModelDefinitions(),
    getTaxonomyNodes(),
    getDocumentTypes(),
  ])

  return (
    <AppShell
      initialPermissions={permissions}
      topbar={<TopBar title="Domain Models" />}
    >
      <DomainModelsWorkbench
        initialDefinitions={definitions}
        initialTaxonomyNodes={taxonomyNodes}
        initialDocumentTypes={documentTypes}
        sourceID={LINK_IQ_SOURCE_ID}
      />
    </AppShell>
  )
}
