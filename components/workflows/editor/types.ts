"use client"

export enum DocumentSource {
  ConsumeFolder = 1,
  ApiUpload = 2,
  MailFetch = 3,
  WebUI = 4,
}

export enum WorkflowTriggerType {
  Consumption = 1,
  DocumentAdded = 2,
  DocumentUpdated = 3,
  Scheduled = 4,
}

export enum ScheduleDateField {
  Added = "added",
  Created = "created",
  Modified = "modified",
  CustomField = "custom_field",
}

export enum WorkflowActionType {
  Assignment = 1,
  Removal = 2,
  Email = 3,
  Webhook = 4,
  PasswordRemoval = 5,
  MoveToTrash = 6,
  RemoteOcr = 7,
}

export type WorkflowTrigger = {
  id?: number | null
  type: WorkflowTriggerType
  sources?: number[]
  filter_filename?: string | null
  filter_path?: string | null
  filter_mailrule?: number | null
  matching_algorithm?: number | null
  match?: string | null
  is_insensitive?: boolean
  filter_has_tags?: number[]
  filter_has_all_tags?: number[]
  filter_has_not_tags?: number[]
  filter_has_any_correspondents?: number[]
  filter_has_not_correspondents?: number[]
  filter_has_any_document_types?: number[]
  filter_has_not_document_types?: number[]
  filter_has_any_storage_paths?: number[]
  filter_has_not_storage_paths?: number[]
  filter_custom_field_query?: string | null
  filter_has_correspondent?: number | null
  filter_has_document_type?: number | null
  filter_has_storage_path?: number | null
  schedule_offset_days?: number | null
  schedule_is_recurring?: boolean
  schedule_recurring_interval_days?: number | null
  schedule_date_field?: ScheduleDateField | null
  schedule_date_custom_field?: number | null
}

export type WorkflowActionEmail = {
  id?: number | null
  subject?: string | null
  body?: string | null
  to?: string | null
  include_document?: boolean
}

export type WorkflowActionWebhook = {
  id?: number | null
  url?: string | null
  use_params?: boolean
  as_json?: boolean
  params?: Record<string, unknown> | null
  body?: string | null
  headers?: Record<string, unknown> | null
  include_document?: boolean
}

export type WorkflowAction = {
  id?: number | null
  type: WorkflowActionType
  assign_title?: string | null
  assign_tags?: number[]
  assign_document_type?: number | null
  assign_correspondent?: number | null
  assign_storage_path?: number | null
  assign_owner?: number | null
  assign_view_users?: number[]
  assign_view_groups?: number[]
  assign_change_users?: number[]
  assign_change_groups?: number[]
  assign_custom_fields?: number[]
  assign_custom_fields_values?: Record<string, unknown> | null
  remove_tags?: number[]
  remove_all_tags?: boolean
  remove_document_types?: number[]
  remove_all_document_types?: boolean
  remove_correspondents?: number[]
  remove_all_correspondents?: boolean
  remove_storage_paths?: number[]
  remove_all_storage_paths?: boolean
  remove_owners?: number[]
  remove_all_owners?: boolean
  remove_view_users?: number[]
  remove_view_groups?: number[]
  remove_change_users?: number[]
  remove_change_groups?: number[]
  remove_all_permissions?: boolean
  remove_custom_fields?: number[]
  remove_all_custom_fields?: boolean
  email?: WorkflowActionEmail | null
  webhook?: WorkflowActionWebhook | null
  passwords?: string[]
}

export type WorkflowDraft = {
  id?: number
  name: string
  order: string
  enabled: boolean
  triggers: WorkflowTrigger[]
  actions: WorkflowAction[]
}

export type WorkflowLookups = {
  tags: Array<{ id: number; name: string }>
  correspondents: Array<{ id: number; name: string }>
  documentTypes: Array<{ id: number; name: string }>
  storagePaths: Array<{ id: number; name: string }>
  customFields: Array<{ id: number; name: string; data_type?: string }>
  users: Array<{ id: number; username?: string }>
  groups: Array<{ id: number; name: string }>
  mailRules?: Array<{ id: number; name: string }>
}

export type WorkflowRecord = {
  id: number
  name: string
  order: number
  enabled: boolean
  triggers?: WorkflowTrigger[]
  actions?: WorkflowAction[]
}

export const DOCUMENT_SOURCE_OPTIONS = [
  { id: DocumentSource.ConsumeFolder, name: "Consume Folder" },
  { id: DocumentSource.ApiUpload, name: "API Upload" },
  { id: DocumentSource.MailFetch, name: "Mail Fetch" },
  { id: DocumentSource.WebUI, name: "Web UI" },
]

export const WORKFLOW_TRIGGER_TYPE_OPTIONS = [
  { id: WorkflowTriggerType.Consumption, name: "Consumption Started" },
  { id: WorkflowTriggerType.DocumentAdded, name: "Document Added" },
  { id: WorkflowTriggerType.DocumentUpdated, name: "Document Updated" },
  { id: WorkflowTriggerType.Scheduled, name: "Scheduled" },
]

export const WORKFLOW_ACTION_TYPE_OPTIONS = [
  { id: WorkflowActionType.Assignment, name: "Assignment" },
  { id: WorkflowActionType.Removal, name: "Removal" },
  { id: WorkflowActionType.Email, name: "Email" },
  { id: WorkflowActionType.Webhook, name: "Webhook" },
  { id: WorkflowActionType.PasswordRemoval, name: "Password removal" },
  { id: WorkflowActionType.MoveToTrash, name: "Move to trash" },
  { id: WorkflowActionType.RemoteOcr, name: "Remote OCR" },
]

export const MATCHING_ALGORITHM_OPTIONS = [
  { id: 1, name: "Any word" },
  { id: 2, name: "All words" },
  { id: 3, name: "Exact match" },
  { id: 4, name: "Regular expression" },
  { id: 5, name: "Fuzzy word" },
  { id: 0, name: "None" },
]

export const SCHEDULE_DATE_FIELD_OPTIONS = [
  { id: ScheduleDateField.Added, name: "Added" },
  { id: ScheduleDateField.Created, name: "Created" },
  { id: ScheduleDateField.Modified, name: "Modified" },
  { id: ScheduleDateField.CustomField, name: "Custom field" },
]

export function createDefaultTrigger(): WorkflowTrigger {
  return {
    type: WorkflowTriggerType.DocumentAdded,
    matching_algorithm: 0,
    is_insensitive: false,
    sources: [DocumentSource.ConsumeFolder, DocumentSource.ApiUpload, DocumentSource.MailFetch],
    filter_has_tags: [],
    filter_has_all_tags: [],
    filter_has_not_tags: [],
    filter_has_any_correspondents: [],
    filter_has_not_correspondents: [],
    filter_has_any_document_types: [],
    filter_has_not_document_types: [],
    filter_has_any_storage_paths: [],
    filter_has_not_storage_paths: [],
    schedule_date_field: ScheduleDateField.Added,
  }
}

export function createDefaultAction(): WorkflowAction {
  return {
    type: WorkflowActionType.Assignment,
    assign_tags: [],
    assign_view_users: [],
    assign_view_groups: [],
    assign_change_users: [],
    assign_change_groups: [],
    assign_custom_fields: [],
    remove_tags: [],
    remove_document_types: [],
    remove_correspondents: [],
    remove_storage_paths: [],
    remove_custom_fields: [],
    remove_owners: [],
    remove_view_users: [],
    remove_view_groups: [],
    remove_change_users: [],
    remove_change_groups: [],
    passwords: [],
  }
}

export function createWorkflowDraft(workflow?: WorkflowRecord | null): WorkflowDraft {
  return {
    id: workflow?.id,
    name: workflow?.name ?? "",
    enabled: workflow?.enabled ?? true,
    order: workflow?.order != null ? String(workflow.order) : "",
    triggers: workflow?.triggers?.length ? workflow.triggers : [createDefaultTrigger()],
    actions: workflow?.actions?.length ? workflow.actions : [createDefaultAction()],
  }
}
