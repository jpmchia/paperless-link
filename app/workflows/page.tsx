import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { WorkflowsTable } from "./workflows-table"

async function getWorkflows() {
  try {
    const data = await getPaperlessApi("workflows/?page_size=100000") as any
    return (data.results || data || []) as any[]
  } catch {
    return []
  }
}

export default async function WorkflowsPage() {
  const session = await getServerSession(authOptions as any)
  if (!session) redirect("/login")

  const workflows = await getWorkflows()

  return (
    <AppShell topbar={<TopBar title="Workflows" />}>
      <div className="p-6 flex flex-col gap-4">
        <WorkflowsTable initialItems={workflows} />
      </div>
    </AppShell>
  )
}
