import { AppShell } from "@/components/app-shell"
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
  getUiSettings,
  filterParamsFromSavedView,
} from "@/lib/api"
import type { FilterParams } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import {
  readRemoteOcrSettings,
  remoteOcrIsSelectable,
} from "@/data/ui-settings"
import { readUserPreferences } from "@/lib/user-preferences"
import { DocumentsWorkspace } from "./documents-workspace"
import type { LookupMaps } from "./columns"
import { TopBar } from "./topbar"

function idx<T extends { id: number }>(arr: T[]): Record<number, T> {
  return Object.fromEntries(arr.map((x) => [x.id, x])) as Record<number, T>
}

type UiSettingsRecord = {
  settings?: {
    document_list_display_mode?: string | null
    document_table_layouts?: {
      global?: {
        displayFields?: string[]
        columnSizing?: Record<string, number>
      }
      views?: Record<
        string,
        {
          displayFields?: string[]
          columnSizing?: Record<string, number>
        }
      >
    } | null
  }
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const permissions = await requireRoutePermission("/documents")
  type WorkspaceProps = React.ComponentProps<typeof DocumentsWorkspace>
  type ActiveView = NonNullable<WorkspaceProps["activeView"]>
  type LookupItem = WorkspaceProps["correspondents"][number]
  type TagOption = LookupMaps["tags"][number]
  type CustomFieldOption = LookupMaps["customFields"][number]
  type UserOption = NonNullable<WorkspaceProps["users"]>[number]
  type AppDocument = WorkspaceProps["data"][number]
  type GroupOption = NonNullable<WorkspaceProps["groupsList"]>[number]

  const params = await searchParams

  // ---- If ?view=<id> is present, load the saved view config ----
  let activeView: ActiveView | null = null
  let initialFilters: FilterParams = {}

  if (params.view) {
    activeView = await getSavedView<ActiveView>(String(params.view))
    if (activeView) {
      initialFilters = filterParamsFromSavedView(activeView)
    }
  }

  // ---- Parse additional URL search params (overrides view defaults) ----
  if (params.query) initialFilters.query = params.query as string
  if (params.title_content) {
    initialFilters.titleContentContains = params.title_content as string
  }
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
  const uiSettings = await getUiSettings<UiSettingsRecord>()
  const userPreferences = readUserPreferences(uiSettings.settings)
  const pageSize =
    Number(params.page_size) || (activeView?.page_size ?? userPreferences.pageSize)

  // ---- Parallel fetch everything ----
  const [documentsData, tagsList, correspondentsList, typesList, pathsList, savedViewsList, customFieldsList, usersList, groupsList, profile] =
    await Promise.all([
      getDocuments(currentPage, pageSize, initialFilters) as Promise<{
        count?: number
        next?: string | null
        previous?: string | null
        results: AppDocument[]
        selectionData?: WorkspaceProps["selectionData"]
      }>,
      getTags<TagOption>(),
      getCorrespondents<LookupItem>(),
      getDocumentTypes<LookupItem>(),
      getStoragePaths<LookupItem>(),
      getSavedViews<WorkspaceProps["savedViews"][number]>(),
      getCustomFields<CustomFieldOption>(),
      getUsers<UserOption>(),
      getGroups<GroupOption>(),
      getProfile<{ id: number }>(),
    ])

  const currentUserId: number | null =
    profile && typeof profile === "object" && "id" in profile && typeof profile.id === "number"
      ? profile.id
      : null
  const remoteOcrSelectable = remoteOcrIsSelectable(
    readRemoteOcrSettings(uiSettings.settings)
  )

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
      <DocumentsWorkspace
        activeView={activeView}
        correspondents={correspondentsList}
        currentFilters={initialFilters}
        currentPage={currentPage}
        currentPageSize={pageSize}
        customFields={customFieldsList}
        data={documentsData.results}
        documentTypes={typesList}
        groupsList={groupsList}
        lookup={lookup}
        pageCount={pageCount}
        savedViews={savedViewsList}
        storagePaths={pathsList}
        tags={tagsList}
        totalCount={documentsData.count || 0}
        users={usersList}
        currentUserId={currentUserId}
        initialDisplayMode={uiSettings.settings?.document_list_display_mode ?? null}
        initialTableLayouts={uiSettings.settings?.document_table_layouts ?? null}
        selectionData={documentsData.selectionData ?? null}
        remoteOcrSelectable={remoteOcrSelectable}
        paperlessBaseUrl={
          process.env.PAPERLESS_PUBLIC_URL?.trim() ||
          process.env.PAPERLESS_API_URL ||
          "http://localhost:8000/"
        }
      />
    </AppShell>
  )
}
