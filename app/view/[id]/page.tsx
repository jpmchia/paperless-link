import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { RealtimeDocumentListSync } from "@/components/realtime-document-list-sync"
import {
  getDocuments,
  getSavedView,
  getTags,
  getCorrespondents,
  getDocumentTypes,
  getStoragePaths,
  getSavedViews,
  getCustomFields,
  getUsers,
  filterParamsFromSavedView,
} from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import type { LookupMaps } from "@/app/documents/columns"
import { DataTable } from "@/app/documents/data-table"
import { FilterPanel } from "@/app/documents/filter-panel"
import { TopBar } from "@/app/documents/topbar"

function idx<T extends { id: number }>(arr: T[]): Record<number, T> {
  return Object.fromEntries(arr.map((x) => [x.id, x])) as Record<number, T>
}

export default async function SavedViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const permissions = await requireRoutePermission("/savedviews")

  const { id } = await params
  const sp = await searchParams

  const view = await getSavedView(id)
  if (!view) redirect("/documents")

  const filters = filterParamsFromSavedView(view)
  if (sp.query) filters.query = sp.query as string
  if (sp.correspondent) filters.correspondent = Number(sp.correspondent)
  if (sp.document_type) filters.documentType = Number(sp.document_type)
  if (sp.storage_path) filters.storagePath = Number(sp.storage_path)
  if (sp.tags) filters.tags = String(sp.tags).split(",").map(Number)
  if (sp.tags_exclude) filters.tagsExclude = String(sp.tags_exclude).split(",").map(Number)
  if (sp.created_after) filters.createdAfter = sp.created_after as string
  if (sp.created_before) filters.createdBefore = sp.created_before as string
  if (sp.added_after) filters.addedAfter = sp.added_after as string
  if (sp.added_before) filters.addedBefore = sp.added_before as string
  if (sp.owner) filters.owner = Number(sp.owner)
  if (sp.owner_any) filters.ownerAny = String(sp.owner_any).split(",").map(Number)
  if (sp.owner_exclude) filters.ownerExclude = String(sp.owner_exclude).split(",").map(Number)
  if (sp.owner_is_null != null) filters.ownerIsNull = String(sp.owner_is_null) === "true"
  if (sp.shared_by_user) filters.sharedByUser = Number(sp.shared_by_user)
  if (sp.ordering) filters.ordering = sp.ordering as string
  if (sp.more_like_id) filters.moreLikeId = Number(sp.more_like_id)

  const currentPage = Number(sp.page) || 1
  const pageSize = Number(sp.page_size) || view.page_size || 25

  const [documentsData, tagsList, correspondentsList, typesList, pathsList, savedViewsList, customFieldsList, usersList] =
    await Promise.all([
      getDocuments(currentPage, pageSize, filters),
      getTags(),
      getCorrespondents(),
      getDocumentTypes(),
      getStoragePaths(),
      getSavedViews(),
      getCustomFields(),
      getUsers(),
    ])

  const pageCount = Math.ceil((documentsData.count || 0) / pageSize)

  const lookup: LookupMaps = {
    correspondents: idx(correspondentsList),
    documentTypes: idx(typesList),
    tags: idx(tagsList),
    storagePaths: idx(pathsList),
    users: idx(usersList),
    customFields: idx(customFieldsList),
  }

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title={view.name} />}>
      <div className="flex flex-col gap-4 p-4 h-full">
        <RealtimeDocumentListSync />
        <FilterPanel
          correspondents={correspondentsList}
          documentTypes={typesList}
          storagePaths={pathsList}
          tags={tagsList}
          users={usersList}
          savedViews={savedViewsList}
          totalCount={documentsData.count || 0}
          activeViewId={view.id}
          activeViewName={view.name}
          activeView={view}
          initialFilters={filters}
        />
        <DataTable
          lookup={lookup}
          data={documentsData.results}
          pageCount={pageCount}
          currentPage={currentPage}
          totalCount={documentsData.count || 0}
          displayFields={view.display_fields ?? undefined}
          activeViewId={view.id}
          currentFilters={filters}
        />
      </div>
    </AppShell>
  )
}
