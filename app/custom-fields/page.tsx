import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi, type PaginatedResults } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { CustomFieldsTable } from "./custom-fields-table"

type CustomFieldTableItem = React.ComponentProps<
  typeof CustomFieldsTable
>["initialItems"][number]

async function getCustomFields() {
  try {
    const data = await getPaperlessApi<PaginatedResults<CustomFieldTableItem>>(
      "custom_fields/?page_size=100000"
    )
    return data.results || []
  } catch {
    return []
  }
}

export default async function CustomFieldsPage() {
  const permissions = await requireRoutePermission("/custom-fields")

  const customFields = await getCustomFields()

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Custom Fields" />}>
      <div className="flex-1 min-h-0 overflow-auto p-6 flex flex-col gap-4">
        <CustomFieldsTable initialItems={customFields} />
      </div>
    </AppShell>
  )
}
