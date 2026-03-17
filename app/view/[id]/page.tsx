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

  const currentPage = Number(sp.page) || 1
  const pageSize = Number(sp.page_size) || view.page_size || 25

  const [documentsData, tagsList, correspondentsList, typesList, pathsList, savedViewsList, customFieldsList] =
    await Promise.all([
      getDocuments(currentPage, pageSize, filters),
      getTags(),
      getCorrespondents(),
      getDocumentTypes(),
      getStoragePaths(),
      getSavedViews(),
      getCustomFields(),
    ])

  const pageCount = Math.ceil((documentsData.count || 0) / pageSize)

  const lookup: LookupMaps = {
    correspondents: idx(correspondentsList),
    documentTypes: idx(typesList),
    tags: idx(tagsList),
    storagePaths: idx(pathsList),
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
