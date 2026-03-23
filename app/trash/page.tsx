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
      "trash/?page=1&page_size=25"
    )) as { count?: number; results?: TrashDocument[] }
    return {
      count: data.count ?? 0,
      results: data.results || [],
    }
  } catch {
    return {
      count: 0,
      results: [],
    }
  }
}

export default async function TrashPage() {
  const permissions = await requireRoutePermission("/trash")

  const trash = await getTrashedDocuments()

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Trash" />}>
      <div className="p-6 flex flex-col gap-4 h-full">
        <TrashTable initialDocuments={trash.results} totalDocuments={trash.count} />
      </div>
    </AppShell>
  )
}
