import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { DocumentTypesTable } from "./document-types-table"

async function getDocumentTypes() {
  try {
    const data = await getPaperlessApi("document_types/?page_size=100000")
    return (data.results || []) as any[]
  } catch {
    return []
  }
}

export default async function DocumentTypesPage() {
  const permissions = await requireRoutePermission("/document-types")

  const documentTypes = await getDocumentTypes()

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Document Types" />}>
      <div className="flex-1 min-h-0 overflow-auto p-6 flex flex-col gap-4">
        <DocumentTypesTable initialItems={documentTypes} />
      </div>
    </AppShell>
  )
}
