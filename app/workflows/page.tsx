import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { WorkflowsTable } from "./workflows-table"

async function getWorkflows() {
  try {
    const data = await getPaperlessApi("workflows/?page_size=100000") as any
    return (data.results || data || []) as any[]
  } catch {
    return []
  }
}

export default async function WorkflowsPage() {
  const permissions = await requireRoutePermission("/workflows")

  const workflows = await getWorkflows()

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Workflows" />}>
      <div className="p-6 flex flex-col gap-4">
        <WorkflowsTable initialItems={workflows} />
      </div>
    </AppShell>
  )
}
