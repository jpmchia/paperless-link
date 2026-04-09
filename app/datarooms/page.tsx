import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { requireRoutePermission } from "@/lib/server-permissions"
import { DataroomsView } from "./datarooms-view"

export default async function DataroomsPage() {
  const permissions = await requireRoutePermission("/domain-models")

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Datarooms" />}>
      <DataroomsView />
    </AppShell>
  )
}
