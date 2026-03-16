import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { UsersTable } from "./users-table"

export default async function UsersPage() {
  const session = await getServerSession(authOptions as any)
  if (!session) redirect("/login")

  const [usersData, groupsData] = await Promise.all([
    getPaperlessApi("users/?page_size=500"),
    getPaperlessApi("groups/?page_size=500"),
  ])

  const users = usersData.results ?? usersData ?? []
  const groups = groupsData.results ?? groupsData ?? []

  return (
    <AppShell topbar={<TopBar title="Users & Groups" />}>
      <div className="p-6 flex flex-col gap-4">
        <UsersTable initialUsers={users} initialGroups={groups} />
      </div>
    </AppShell>
  )
}
