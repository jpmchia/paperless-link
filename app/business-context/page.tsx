import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { ContextField } from "@/lib/link-iq-types"
import { requireRoutePermission } from "@/lib/server-permissions"
import { BusinessContextView } from "./business-context-view"

async function getInitialFields() {
  try {
    const result = await invokeLinkIQAction<{ fields?: ContextField[] }>({
      capability: "context_field.list",
      input: { section: "business_context" },
    })
    return { fields: result.fields ?? [], error: null as string | null }
  } catch (error) {
    return {
      fields: [],
      error: error instanceof Error ? error.message : "Failed to load business context",
    }
  }
}

export default async function BusinessContextPage() {
  const permissions = await requireRoutePermission("/business-context")
  const { fields, error } = await getInitialFields()

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Business Context" />}>
      <BusinessContextView initialFields={fields} initialLoadError={error} />
    </AppShell>
  )
}
