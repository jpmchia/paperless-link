import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getCorrespondents, getCustomFields, getDocumentTypes, getPaperlessApi, getStoragePaths, getTags, getUsers, getGroups } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { WorkflowsTable } from "./workflows-table"

type WorkflowRecord = React.ComponentProps<typeof WorkflowsTable>["initialItems"][number]
type PaginatedWorkflowList = { results?: WorkflowRecord[] } | WorkflowRecord[]

async function getWorkflows() {
  try {
    const data = (await getPaperlessApi("workflows/?page_size=100000")) as PaginatedWorkflowList
    return Array.isArray(data) ? data : data.results ?? []
  } catch {
    return [] as WorkflowRecord[]
  }
}

export default async function WorkflowsPage() {
  const permissions = await requireRoutePermission("/workflows")

  const [workflows, tags, correspondents, documentTypes, storagePaths, customFields, users, groups] = await Promise.all([
    getWorkflows(),
    getTags(),
    getCorrespondents(),
    getDocumentTypes(),
    getStoragePaths(),
    getCustomFields(),
    getUsers(),
    getGroups(),
  ])

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Workflows" />}>
      <div className="p-6 flex flex-col gap-4">
        <WorkflowsTable
          initialItems={workflows}
          lookups={{
            correspondents,
            customFields,
            documentTypes,
            groups,
            storagePaths,
            tags,
            users,
          }}
        />
      </div>
    </AppShell>
  )
}
