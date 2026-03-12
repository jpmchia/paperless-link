import { CustomFieldInstance } from './custom-field-instance'
import { DocumentNote } from './document-note'
import { ObjectWithPermissions } from './object-with-permissions'

export enum DisplayMode {
  TABLE = 'table',
  SMALL_CARDS = 'smallCards',
  LARGE_CARDS = 'largeCards',
}

export enum DisplayField {
  TITLE = 'title',
  CREATED = 'created',
  ADDED = 'added',
  TAGS = 'tag',
  CORRESPONDENT = 'correspondent',
  DOCUMENT_TYPE = 'documenttype',
  STORAGE_PATH = 'storagepath',
  CUSTOM_FIELD = 'custom_field_',
  NOTES = 'note',
  OWNER = 'owner',
  SHARED = 'shared',
  ASN = 'asn',
  PAGE_COUNT = 'pagecount',
}

export const DEFAULT_DISPLAY_FIELDS = [
  {
    id: DisplayField.TITLE,
    name: 'Title',
  },
  {
    id: DisplayField.CREATED,
    name: 'Created',
  },
  {
    id: DisplayField.ADDED,
    name: 'Added',
  },
  {
    id: DisplayField.TAGS,
    name: 'Tags',
  },
  {
    id: DisplayField.CORRESPONDENT,
    name: 'Correspondent',
  },
  {
    id: DisplayField.DOCUMENT_TYPE,
    name: 'Document type',
  },
  {
    id: DisplayField.STORAGE_PATH,
    name: 'Storage path',
  },
  {
    id: DisplayField.NOTES,
    name: 'Notes',
  },
  {
    id: DisplayField.OWNER,
    name: 'Owner',
  },
  {
    id: DisplayField.SHARED,
    name: 'Shared',
  },
  {
    id: DisplayField.ASN,
    name: 'ASN',
  },
  {
    id: DisplayField.PAGE_COUNT,
    name: 'Pages',
  },
]

export const DEFAULT_DASHBOARD_VIEW_PAGE_SIZE = 10

export const DEFAULT_DASHBOARD_DISPLAY_FIELDS = [
  DisplayField.CREATED,
  DisplayField.TITLE,
  DisplayField.TAGS,
  DisplayField.CORRESPONDENT,
]

export const DOCUMENT_SORT_FIELDS = [
  { field: 'archive_serial_number', name: 'ASN' },
  { field: 'correspondent__name', name: 'Correspondent' },
  { field: 'title', name: 'Title' },
  { field: 'document_type__name', name: 'Document type' },
  { field: 'created', name: 'Created' },
  { field: 'added', name: 'Added' },
  { field: 'modified', name: 'Modified' },
  { field: 'num_notes', name: 'Notes' },
  { field: 'owner', name: 'Owner' },
  { field: 'page_count', name: 'Pages' },
]

export const DOCUMENT_SORT_FIELDS_FULLTEXT = [
  {
    field: 'score',
    name: ':Score is a value returned by the full text search engine and specifies how well a result matches the given query:Search score',
  },
]

export interface SearchHit {
  score?: number
  rank?: number

  highlights?: string
  note_highlights?: string
}

export interface Document extends ObjectWithPermissions {
  correspondent?: number

  document_type?: number

  storage_path?: number

  title?: string

  content?: string

  tags?: number[]

  checksum?: string

  // UTC
  created?: string // ISO string

  modified?: string // ISO string

  added?: string // ISO string

  mime_type?: string

  deleted_at?: string // ISO string

  original_file_name?: string

  archived_file_name?: string

  download_url?: string

  thumbnail_url?: string

  archive_serial_number?: number

  notes?: DocumentNote[]

  __search_hit__?: SearchHit

  custom_fields?: CustomFieldInstance[]

  // write-only field
  remove_inbox_tags?: boolean

  page_count?: number

  duplicate_documents?: Document[]

  // Versioning
  root_document?: number
  versions?: DocumentVersionInfo[]

  // Frontend only
  __changedFields?: string[]
}

export interface DocumentVersionInfo {
  id: number
  added?: Date
  version_label?: string
  checksum?: string
  is_root: boolean
}
