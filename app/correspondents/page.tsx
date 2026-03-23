import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi, type PaginatedResults } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { CorrespondentsTable } from "./correspondents-table"

type CorrespondentTableItem = React.ComponentProps<
  typeof CorrespondentsTable
>["initialCorrespondents"][number]

async function getCorrespondents() {
  try {
    const data = await getPaperlessApi<PaginatedResults<CorrespondentTableItem>>(
      "correspondents/?page_size=100000"
    )
    return data.results || []
  } catch {
    return []
  }
}

export default async function CorrespondentsPage() {
  const permissions = await requireRoutePermission("/correspondents")

  const correspondents = await getCorrespondents()

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Correspondents" />}>
      <div className="flex-1 min-h-0 overflow-auto p-6 flex flex-col gap-4">
        <CorrespondentsTable initialCorrespondents={correspondents} />
      </div>
    </AppShell>
  )
}
