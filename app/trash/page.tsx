import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { TrashTable } from "./trash-table"

async function getTrashedDocuments() {
  try {
    const data = await getPaperlessApi("documents/?is_in_trash=true&page_size=100") as any
    return (data.results || []) as any[]
  } catch {
    return []
  }
}

export default async function TrashPage() {
  const session = await getServerSession(authOptions as any)
  if (!session) redirect("/login")

  const documents = await getTrashedDocuments()

  return (
    <AppShell topbar={<TopBar title="Trash" />}>
      <div className="p-6 flex flex-col gap-4 h-full">
        <TrashTable documents={documents} />
      </div>
    </AppShell>
  )
}
