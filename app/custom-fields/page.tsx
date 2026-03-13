import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { CustomFieldsTable } from "./custom-fields-table"

async function getCustomFields() {
  try {
    const data = await getPaperlessApi("custom_fields/?page_size=100000")
    return (data.results || []) as any[]
  } catch {
    return []
  }
}

export default async function CustomFieldsPage() {
  const session = await getServerSession(authOptions as any)
  if (!session) redirect("/login")

  const customFields = await getCustomFields()

  return (
    <AppShell topbar={<TopBar title="Custom Fields" />}>
      <div className="p-6 flex flex-col gap-4">
        <CustomFieldsTable initialItems={customFields} />
      </div>
    </AppShell>
  )
}
