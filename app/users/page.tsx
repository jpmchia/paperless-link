import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { UsersTable } from "./users-table"

export default async function UsersPage() {
  const permissions = await requireRoutePermission("/users")
  type TableProps = React.ComponentProps<typeof UsersTable>
  type Paginated<T> = { results?: T[] } | T[]

  const [usersData, groupsData] = await Promise.all([
    getPaperlessApi<Paginated<TableProps["initialUsers"][number]>>("users/?page_size=500"),
    getPaperlessApi<Paginated<TableProps["initialGroups"][number]>>("groups/?page_size=500"),
  ])

  const users = Array.isArray(usersData) ? usersData : usersData.results ?? []
  const groups = Array.isArray(groupsData) ? groupsData : groupsData.results ?? []

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Users & Groups" />}>
      <div className="p-6 flex flex-col gap-4">
        <UsersTable initialUsers={users} initialGroups={groups} />
      </div>
    </AppShell>
  )
}
