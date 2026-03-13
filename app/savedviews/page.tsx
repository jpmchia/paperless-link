import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getSavedViews } from "@/lib/api"
import { SavedViewsTable } from "./saved-views-table"

export default async function SavedViewsPage() {
  const session = await getServerSession(authOptions as any)
  if (!session) redirect("/login")

  const savedViews = await getSavedViews()

  return (
    <AppShell topbar={<TopBar title="Saved Views" />}>
      <div className="p-6 flex flex-col gap-4">
        <SavedViewsTable initialViews={savedViews} />
      </div>
    </AppShell>
  )
}
