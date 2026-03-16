import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { StoragePathsTable } from "./storage-paths-table"

async function getStoragePaths() {
  try {
    const data = await getPaperlessApi("storage_paths/?page_size=100000")
    return (data.results || []) as any[]
  } catch {
    return []
  }
}

export default async function StoragePathsPage() {
  const permissions = await requireRoutePermission("/storage-paths")

  const storagePaths = await getStoragePaths()

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Storage Paths" />}>
      <div className="p-6 flex flex-col gap-4">
        <StoragePathsTable initialItems={storagePaths} />
      </div>
    </AppShell>
  )
}
