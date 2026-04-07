import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { invokeLinkIQAction, LINK_IQ_SOURCE_ID } from "@/lib/link-iq"
import { requireRoutePermission } from "@/lib/server-permissions"
import { listTaxonomyNodeTypes } from "@/lib/taxonomy-node-types"
import { TaxonomyWorkbench } from "./taxonomy-workbench"

type TaxonomyNode = React.ComponentProps<
  typeof TaxonomyWorkbench
>["initialNodes"][number]

function filterScopedNodes(nodes: TaxonomyNode[], sourceID: string) {
  return nodes.filter((node) => {
    if (!node.source_scope || node.source_scope === "link_global") return true
    return node.source_id === sourceID
  })
}

async function getTaxonomyNodes() {
  try {
    const result = await invokeLinkIQAction<{ nodes?: TaxonomyNode[] }>({
      capability: "taxonomy.list",
      input: {
        status: "all",
      },
    })

    return filterScopedNodes(result.nodes ?? [], LINK_IQ_SOURCE_ID).sort(
      (left, right) => left.path.localeCompare(right.path)
    )
  } catch {
    return []
  }
}

export default async function TaxonomyPage() {
  const permissions = await requireRoutePermission("/taxonomy")
  const nodes = await getTaxonomyNodes()
  const configuredNodeTypes = await listTaxonomyNodeTypes().catch(() => [])

  return (
    <AppShell
      initialPermissions={permissions}
      topbar={<TopBar title="Taxonomy" />}
    >
      <TaxonomyWorkbench
        initialNodes={nodes}
        sourceID={LINK_IQ_SOURCE_ID}
        configuredNodeTypes={configuredNodeTypes}
      />
    </AppShell>
  )
}
