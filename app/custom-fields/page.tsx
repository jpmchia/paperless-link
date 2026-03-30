import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi, type PaginatedResults } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { CustomFieldsTable } from "./custom-fields-table"

type CustomFieldTableItem = React.ComponentProps<
  typeof CustomFieldsTable
>["initialItems"][number]

async function getCustomFields() {
  try {
    const data = await getPaperlessApi<PaginatedResults<CustomFieldTableItem>>(
      "custom_fields/?page_size=100000"
    )
    return { items: data.results || [], error: null as string | null }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load custom fields from Paperless."
    return { items: [] as CustomFieldTableItem[], error: message }
  }
}

export default async function CustomFieldsPage() {
  const permissions = await requireRoutePermission("/custom-fields")

  const { items: customFields, error } = await getCustomFields()

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Custom Fields" />}>
      <div className="flex-1 min-h-0 overflow-auto p-6 flex flex-col gap-4">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load custom fields</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <CustomFieldsTable initialItems={customFields} />
      </div>
    </AppShell>
  )
}
