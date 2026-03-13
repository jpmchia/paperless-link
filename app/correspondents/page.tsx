import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { CorrespondentsTable } from "./correspondents-table"

async function getCorrespondents() {
  try {
    const data = await getPaperlessApi("correspondents/?page_size=100000")
    return (data.results || []) as any[]
  } catch {
    return []
  }
}

export default async function CorrespondentsPage() {
  const session = await getServerSession(authOptions as any)
  if (!session) redirect("/login")

  const correspondents = await getCorrespondents()

  return (
    <AppShell topbar={<TopBar title="Correspondents" />}>
      <div className="p-6 flex flex-col gap-4">
        <CorrespondentsTable initialCorrespondents={correspondents} />
      </div>
    </AppShell>
  )
}
