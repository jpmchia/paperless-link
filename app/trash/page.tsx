import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { TrashTable } from "./trash-table"

async function getTrashedDocuments() {
  try {
    const data = await getPaperlessApi("documents/?is_in_trash=true&page_size=100") as any
    return (data.results || []) as any[]
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
