import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi, type PaginatedResults } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { DocumentTypesTable } from "./document-types-table"

type DocumentTypeTableItem = React.ComponentProps<
  typeof DocumentTypesTable
>["initialItems"][number]

async function getDocumentTypes() {
  try {
    const data = await getPaperlessApi<PaginatedResults<DocumentTypeTableItem>>(
      "document_types/?page_size=100000"
    )
    return { items: data.results || [], error: null as string | null }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load document types from Paperless."
    return { items: [] as DocumentTypeTableItem[], error: message }
  }
}

export default async function DocumentTypesPage() {
  const permissions = await requireRoutePermission("/document-types")

  const { items: documentTypes, error } = await getDocumentTypes()

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Document Types" />}>
      <div className="flex-1 min-h-0 overflow-auto p-6 flex flex-col gap-4">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load document types</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DocumentTypesTable initialItems={documentTypes} />
      </div>
    </AppShell>
  )
}
