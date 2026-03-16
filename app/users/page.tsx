import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { UsersTable } from "./users-table"

export default async function UsersPage() {
  const permissions = await requireRoutePermission("/users")

  const [usersData, groupsData] = await Promise.all([
    getPaperlessApi("users/?page_size=500"),
    getPaperlessApi("groups/?page_size=500"),
  ])

  const users = usersData.results ?? usersData ?? []
  const groups = groupsData.results ?? groupsData ?? []

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Users & Groups" />}>
      <div className="p-6 flex flex-col gap-4">
        <UsersTable initialUsers={users} initialGroups={groups} />
      </div>
    </AppShell>
  )
}
