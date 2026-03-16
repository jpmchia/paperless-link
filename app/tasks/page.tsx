import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { requireRoutePermission } from "@/lib/server-permissions"
import { TasksView } from "./tasks-view"

export default async function TasksPage() {
  const permissions = await requireRoutePermission("/tasks")

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Background Tasks" />}>
      <div className="p-6 flex flex-col gap-4 h-full">
        <TasksView />
      </div>
    </AppShell>
  )
}
