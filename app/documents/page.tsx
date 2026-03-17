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
  getGroups,
  getProfile,
  filterParamsFromSavedView,
} from "@/lib/api"
import type { FilterParams } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { DataTable } from "./data-table"
import type { LookupMaps } from "./columns"
import { TopBar } from "./topbar"
import { FilterPanel } from "./filter-panel"

function idx<T extends { id: number }>(arr: T[]): Record<number, T> {
  return Object.fromEntries(arr.map((x) => [x.id, x])) as Record<number, T>
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const permissions = await requireRoutePermission("/documents")

  const params = await searchParams

  // ---- If ?view=<id> is present, load the saved view config ----
  let activeView: any = null
  let initialFilters: FilterParams = {}

  if (params.view) {
    activeView = await getSavedView(String(params.view))
    if (activeView) {
      initialFilters = filterParamsFromSavedView(activeView)
    }
  }

  // ---- Parse additional URL search params (overrides view defaults) ----
  if (params.query) initialFilters.query = params.query as string
  if (params.correspondent) initialFilters.correspondent = Number(params.correspondent)
  if (params.document_type) initialFilters.documentType = Number(params.document_type)
  if (params.storage_path) initialFilters.storagePath = Number(params.storage_path)
  if (params.tags) initialFilters.tags = String(params.tags).split(",").map(Number)
  if (params.tags_exclude) initialFilters.tagsExclude = String(params.tags_exclude).split(",").map(Number)
  if (params.created_after) initialFilters.createdAfter = params.created_after as string
  if (params.created_before) initialFilters.createdBefore = params.created_before as string
  if (params.added_after) initialFilters.addedAfter = params.added_after as string
  if (params.added_before) initialFilters.addedBefore = params.added_before as string
  if (params.owner) initialFilters.owner = Number(params.owner)
  if (params.owner_any) initialFilters.ownerAny = String(params.owner_any).split(",").map(Number)
  if (params.owner_exclude) initialFilters.ownerExclude = String(params.owner_exclude).split(",").map(Number)
  if (params.owner_is_null != null) initialFilters.ownerIsNull = String(params.owner_is_null) === "true"
  if (params.shared_by_user) initialFilters.sharedByUser = Number(params.shared_by_user)
  if (params.ordering) initialFilters.ordering = params.ordering as string
  if (params.more_like_id) initialFilters.moreLikeId = Number(params.more_like_id)

  const currentPage = Number(params.page) || 1
  const pageSize = Number(params.page_size) || (activeView?.page_size ?? 25)

  // ---- Parallel fetch everything ----
  const [documentsData, tagsList, correspondentsList, typesList, pathsList, savedViewsList, customFieldsList, usersList, groupsList, profile] =
    await Promise.all([
      getDocuments(currentPage, pageSize, initialFilters),
      getTags(),
      getCorrespondents(),
      getDocumentTypes(),
      getStoragePaths(),
      getSavedViews(),
      getCustomFields(),
      getUsers(),
      getGroups(),
      getProfile(),
    ])

  const currentUserId: number | null = (profile as any)?.id ?? null

  const pageCount = Math.ceil((documentsData.count || 0) / pageSize)

  const title = activeView ? activeView.name : "Documents"

  const lookup: LookupMaps = {
    correspondents: idx(correspondentsList),
    documentTypes: idx(typesList),
    tags: idx(tagsList),
    storagePaths: idx(pathsList),
    users: idx(usersList),
    customFields: idx(customFieldsList),
  }

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title={title} />}>
      <div className="flex flex-col gap-4 p-4 h-full">
        <RealtimeDocumentListSync />
        <FilterPanel
          correspondents={correspondentsList}
          documentTypes={typesList}
          storagePaths={pathsList}
          tags={tagsList}
          savedViews={savedViewsList}
          totalCount={documentsData.count || 0}
          activeViewId={activeView?.id ?? null}
          activeViewName={activeView?.name ?? null}
          activeView={activeView}
          initialFilters={initialFilters}
          currentUserId={currentUserId}
          users={usersList}
        />
        <DataTable
          lookup={lookup}
          data={documentsData.results}
          pageCount={pageCount}
          currentPage={currentPage}
          totalCount={documentsData.count || 0}
          displayFields={activeView?.display_fields ?? undefined}
          activeViewId={activeView?.id ?? null}
          currentFilters={initialFilters}
          usersList={usersList}
          groupsList={groupsList}
        />
      </div>
    </AppShell>
  )
}
