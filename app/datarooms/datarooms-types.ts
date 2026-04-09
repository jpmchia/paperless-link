import type {
  Dataroom,
  DataroomDocumentPlacement,
  DataroomFolder,
  DataroomInvitee,
  DataroomInviteeStats,
  DataroomOwner,
  DataroomRelease,
  DataroomReleaseItem,
  DataroomSummaryCount,
} from "@/lib/link-iq-types"

export type DataroomListResponse = { datarooms?: Dataroom[] }
export type OwnersResponse = { owners?: DataroomOwner[] }
export type FoldersResponse = { folders?: DataroomFolder[]; folder_counts?: Record<string, number> }
export type InviteesResponse = { invitees?: DataroomInvitee[] }
export type AnalyticsResponse = {
  summary?: DataroomSummaryCount[]
  invitees?: DataroomInviteeStats[]
}
export type PlacementsResponse = { placements?: DataroomDocumentPlacement[] }
export type ReleasesResponse = { releases?: DataroomRelease[] }
export type ReleaseItemsResponse = { items?: DataroomReleaseItem[] }
export type Paginated<T> = { results?: T[] } | T[]
export type PaginatedWithCount<T> = {
  count?: number
  next?: string | null
  previous?: string | null
  results?: T[]
}
export type PaperlessUser = {
  id: number
  username?: string
  first_name?: string
  last_name?: string
  email?: string
  last_login?: string
}
export type TaxonomyNodeOption = { taxonomy_node_id?: string; label?: string; path?: string }
export type DocumentTypeOption = { id: number; name?: string }
export type CorrespondentOption = { id: number; name?: string }
export type EntityTypeOption = { entity_type_id?: string; label?: string }
export type TagOption = { id: number; name?: string; color?: string | number }
export type StoragePathOption = { id: number; name?: string }
export type CustomFieldOption = {
  id: number
  name?: string
  data_type?: string
  extra_data?: {
    select_options?: Array<string | { id?: string | number; label?: string }>
  }
}
export type PaperlessDocument = {
  id: number
  title?: string
  content?: string
  created?: string
  added?: string
  modified?: string
  archive_serial_number?: number | null
  correspondent?: number | null
  document_type?: number | null
  storage_path?: number | null
  tags?: number[]
  custom_fields?: { value: unknown; field: number }[]
  owner?: number | null
  notes?: { id: number; note?: string }[]
  num_notes?: number | null
  page_count?: number | null
  is_shared_by_requester?: boolean
  original_md5?: string
  archive_md5?: string
  original_file_size?: number
  archive_file_size?: number
}

export type FolderTreeNode = {
  folder: DataroomFolder
  children: FolderTreeNode[]
}

export type PublishWorkspaceView = "immediate" | "scheduled" | "manual"
