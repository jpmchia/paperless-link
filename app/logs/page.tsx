import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { requireRoutePermission } from "@/lib/server-permissions"
import { LogsView } from "./logs-view"

export default async function LogsPage() {
  const permissions = await requireRoutePermission("/logs")

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Server Logs" />}>
      <div className="p-6 flex flex-col gap-4 h-full">
        <LogsView />
      </div>
    </AppShell>
  )
}
