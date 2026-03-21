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

  const [
    savedViews,
    correspondents,
    documentTypes,
    storagePaths,
    tags,
    users,
    customFields,
  ] = await Promise.all([
    getSavedViews(),
    getCorrespondents(),
    getDocumentTypes(),
    getStoragePaths(),
    getTags(),
    getUsers(),
    getCustomFields(),
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
