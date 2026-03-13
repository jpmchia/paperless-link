import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { LogsView } from "./logs-view"

export default async function LogsPage() {
  const session = await getServerSession(authOptions as any)
  if (!session) redirect("/login")

  return (
    <AppShell topbar={<TopBar title="Server Logs" />}>
      <div className="p-6 flex flex-col gap-4 h-full">
        <LogsView />
      </div>
    </AppShell>
  )
}
