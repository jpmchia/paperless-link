import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import {
  getCorrespondents,
  getCustomFields,
  getDocumentTypes,
  getSavedViews,
  getStoragePaths,
  getTags,
  getUsers,
} from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { SavedViewsTable } from "./saved-views-table"

export default async function SavedViewsPage() {
  const permissions = await requireRoutePermission("/savedviews")
  type TableProps = React.ComponentProps<typeof SavedViewsTable>

  const [
    savedViews,
    correspondents,
    documentTypes,
    storagePaths,
    tags,
    users,
    customFields,
  ] = await Promise.all([
    getSavedViews<TableProps["initialViews"][number]>(),
    getCorrespondents<TableProps["correspondents"][number]>(),
    getDocumentTypes<TableProps["documentTypes"][number]>(),
    getStoragePaths<TableProps["storagePaths"][number]>(),
    getTags<TableProps["tags"][number]>(),
    getUsers<TableProps["users"][number]>(),
    getCustomFields<TableProps["customFields"][number]>(),
  ])

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Saved Views" />}>
      <div className="p-6 flex flex-col gap-4">
        <SavedViewsTable
          initialViews={savedViews}
          correspondents={correspondents}
          documentTypes={documentTypes}
          storagePaths={storagePaths}
          tags={tags}
          users={users}
          customFields={customFields}
        />
      </div>
    </AppShell>
  )
}
