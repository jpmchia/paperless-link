import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { TasksView } from "./tasks-view"

export default async function TasksPage() {
  const session = await getServerSession(authOptions as any)
  if (!session) redirect("/login")

  return (
    <AppShell topbar={<TopBar title="Background Tasks" />}>
      <div className="p-6 flex flex-col gap-4 h-full">
        <TasksView />
      </div>
    </AppShell>
  )
}
