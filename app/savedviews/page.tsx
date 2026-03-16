import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getSavedViews } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { SavedViewsTable } from "./saved-views-table"

export default async function SavedViewsPage() {
  const permissions = await requireRoutePermission("/savedviews")

  const savedViews = await getSavedViews()

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Saved Views" />}>
      <div className="p-6 flex flex-col gap-4">
        <SavedViewsTable initialViews={savedViews} />
      </div>
    </AppShell>
  )
}
