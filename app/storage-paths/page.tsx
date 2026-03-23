import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi, type PaginatedResults } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { StoragePathsTable } from "./storage-paths-table"

type StoragePathTableItem = React.ComponentProps<
  typeof StoragePathsTable
>["initialItems"][number]

async function getStoragePaths() {
  try {
    const data = await getPaperlessApi<PaginatedResults<StoragePathTableItem>>(
      "storage_paths/?page_size=100000"
    )
    return data.results || []
  } catch {
    return []
  }
}

export default async function StoragePathsPage() {
  const permissions = await requireRoutePermission("/storage-paths")

  const storagePaths = await getStoragePaths()

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Storage Paths" />}>
      <div className="flex-1 min-h-0 overflow-auto p-6 flex flex-col gap-4">
        <StoragePathsTable initialItems={storagePaths} />
      </div>
    </AppShell>
  )
}
