import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { TrashTable } from "./trash-table"

interface TrashDocument {
  created?: string
  deleted_at?: string
  id: number
  title: string
}

async function getTrashedDocuments() {
  try {
    const data = (await getPaperlessApi(
      "trash/?page=1&page_size=100"
    )) as { results?: TrashDocument[] }
    return data.results || []
  } catch {
    return []
  }
}

export default async function TrashPage() {
  const permissions = await requireRoutePermission("/trash")

  const documents = await getTrashedDocuments()

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Trash" />}>
      <div className="p-6 flex flex-col gap-4 h-full">
        <TrashTable documents={documents} />
      </div>
    </AppShell>
  )
}
