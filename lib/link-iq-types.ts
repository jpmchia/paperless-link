export type LinkIQScopedRecord = {
  source_id?: string
  source_scope?: string
  status?: string
}

export type TaxonomyNode = LinkIQScopedRecord & {
  created_at?: string
  depth?: number
  description?: string
  label?: string
  mapping_state?: string
  node_type?: string
  parent_node_id?: string
  path: string
  sort_order?: number
  taxonomy_node_id: string
  updated_at?: string
}

export type AttributeType = {
  allowed_qualifier_ids?: string[]
  attribute_type_id: string
  cardinality: string
  description?: string
  label: string
  name: string
  required?: boolean
  target_entity_type_id?: string
  value_type: string
}

export type EntityType = LinkIQScopedRecord & {
  attributes?: AttributeType[]
  created_at?: string
  description?: string
  entity_type_id: string
  label: string
  updated_at?: string
}

export type Qualifier = LinkIQScopedRecord & {
  applies_to?: string[]
  created_at?: string
  description?: string
  label: string
  name: string
  qualifier_id: string
  updated_at?: string
}

export type ExampleDocumentRef = {
  document_id: string
  source_id?: string
  title?: string
}

export type ExampleDocument = ExampleDocumentRef & {
  result?: Record<string, unknown>
}

export type AttributeUsage = {
  applicability?: string
  attribute_type_id: string
  description?: string
  label?: string
  qualifier_ids?: string[]
  required?: boolean
  usage_id: string
}

export type EntityUsage = {
  applicability?: string
  attributes?: AttributeUsage[]
  cardinality: string
  description?: string
  entity_type_id: string
  label?: string
  qualifier_ids?: string[]
  required?: boolean
  usage_id: string
}

export type ContextProfile = LinkIQScopedRecord & {
  created_at?: string
  description?: string
  document_type?: string
  entity_usages?: EntityUsage[]
  example_documents?: ExampleDocumentRef[]
  label: string
  profile_id: string
  taxonomy_node_id?: string
  taxonomy_path?: string
  updated_at?: string
  version: number
}

export type AIProvider = {
  provider_id: string
  label: string
  provider_type: string
  compatibility_mode: string
  pricing_source_type?: string
  pricing_source_url?: string
  pricing_refresh_hours?: number
  pricing_last_status?: string
  pricing_last_error?: string
  pricing_last_refreshed_at?: string
  description?: string
  base_url: string
  api_key?: string
  headers?: Record<string, string>
  organization?: string
  project?: string
  timeout_seconds?: number
  status: string
  created_at?: string
  updated_at?: string
}

export type AIModel = {
  model_id: string
  provider_id: string
  catalog_id?: string
  label: string
  model_name: string
  model_type: string
  description?: string
  max_context_tokens?: number
  max_output_tokens?: number
  pricing_source_type?: string
  pricing_source_url?: string
  pricing_refreshed_at?: string
  input_cost_per_million?: number
  output_cost_per_million?: number
  cache_read_cost_per_million?: number
  cache_write_cost_per_million?: number
  temperature?: number
  top_p?: number
  status: string
  created_at?: string
  updated_at?: string
}

export type AIProviderModelCatalogEntry = {
  catalog_id: string
  provider_id: string
  model_name: string
  display_name?: string
  owned_by?: string
  provider_object?: string
  provider_payload?: Record<string, unknown>
  availability_status: string
  pricing_match_status?: string
  pricing_source_type?: string
  pricing_source_url?: string
  pricing_refreshed_at?: string
  input_cost_per_million?: number
  output_cost_per_million?: number
  cache_read_cost_per_million?: number
  cache_write_cost_per_million?: number
  max_context_tokens?: number
  max_output_tokens?: number
  raw_pricing_payload?: Record<string, unknown>
  enabled_model_id?: string
  discovered_at?: string
  updated_at?: string
}

export type AIModelHistoryEntry = {
  revision_id: string
  model_id: string
  provider_id: string
  catalog_id?: string
  label: string
  model_name: string
  model_type: string
  description?: string
  max_context_tokens?: number
  max_output_tokens?: number
  pricing_source_type?: string
  pricing_source_url?: string
  pricing_refreshed_at?: string
  input_cost_per_million?: number
  output_cost_per_million?: number
  cache_read_cost_per_million?: number
  cache_write_cost_per_million?: number
  temperature?: number
  top_p?: number
  status: string
  changed_at?: string
  changed_by_user_id?: string
  changed_by_username?: string
  change_reason: string
}

export type AIProcessConfig = {
  process_key: string
  section: string
  label: string
  description?: string
  retain_history?: boolean
  include_history?: boolean
  history_text_length?: number
  default_model_id?: string
  fallback_model_id?: string
  available_model_ids?: string[]
  provider_id?: string
  model_id?: string
  prompt_template: string
  output_format?: string
  status: string
  created_at?: string
  updated_at?: string
}

export type AIGeneratedTextResult = {
  process_key: string
  provider_id: string
  model_id: string
  model_label?: string
  prompt: string
  output_text: string
  raw_response?: Record<string, unknown>
  generated_at?: string
}

export type AIModelRunResult = {
  provider_id: string
  model_id: string
  model_label?: string
  prompt: string
  output_text: string
  raw_response?: Record<string, unknown>
  generated_at?: string
}

export type ContextField = {
  field_id: string
  section: string
  scope: string
  key: string
  label: string
  description?: string
  field_mode: string
  data_type: string
  value_source?: string
  dynamic_source?: string
  source_id?: string
  acceptable_values?: string[]
  sample_values?: string[]
  value?: string
  schema_locked?: boolean
  status: string
  created_at?: string
  updated_at?: string
}

export type ContextFieldHistoryEntry = {
  revision_id: string
  field_id: string
  section: string
  scope: string
  key: string
  label: string
  description?: string
  field_mode: string
  data_type: string
  value_source?: string
  dynamic_source?: string
  source_id?: string
  acceptable_values?: string[]
  sample_values?: string[]
  value?: string
  status: string
  changed_at?: string
  changed_by_user_id?: string
  changed_by_username?: string
}

export type DataroomEmailTemplate = {
  subject?: string
  body_html?: string
  body_text?: string
}

export type DataroomDocumentUIField = {
  field_key: string
  label_override?: string
  visible?: boolean
}

export type DataroomDocumentUITab = {
  tab_key: string
  label: string
  sort_order?: number
  fields?: DataroomDocumentUIField[]
}

export type Dataroom = {
  dataroom_id: string
  slug: string
  title: string
  description?: string
  commencement_date?: string
  closure_date?: string
  auto_publish_immediately?: boolean
  auto_publish_scheduled_time?: string
  default_token_lifetime_minutes?: number
  login_logo_url?: string
  login_logo_dark_url?: string
  current_release_id?: string
  email_templates?: Record<string, DataroomEmailTemplate>
  document_ui_config?: DataroomDocumentUITab[]
  created_by_subject_id?: string
  created_at?: string
  updated_at?: string
}

export type DataroomOwner = {
  dataroom_id: string
  subject_id: string
  created_at?: string
  updated_at?: string
}

export type DataroomFolder = {
  folder_id: string
  dataroom_id: string
  parent_folder_id?: string
  label: string
  linked_item_type?: "taxonomy" | "document_type" | "correspondent" | "domain_entity"
  linked_item_id?: string
  linked_item_label?: string
  rules?: string
  description?: string
  auto_publish_immediately?: boolean
  auto_publish_scheduled_time?: string
  publishing_on_hold?: boolean
  published_metadata_fields?: string[]
  published_custom_field_ids?: string[]
  sort_order?: number
  created_at?: string
  updated_at?: string
}

export type DataroomInvitee = {
  invitee_id?: string
  dataroom_id?: string
  email: string
  disabled?: boolean
  access_start?: string
  access_end?: string
  access_preset?: string
  magic_link_mode?: "one_time" | "ttl_minutes"
  magic_link_ttl_minutes?: number
  activated_at?: string
  created_at?: string
  updated_at?: string
}

export type DataroomDocumentPlacement = {
  placement_id?: string
  dataroom_id?: string
  folder_id: string
  source_id?: string
  document_id: string
  created_at?: string
  updated_at?: string
}

export type DataroomReleaseItem = {
  document_id: string
  folder_id: string
  source_id?: string
  metadata_snapshot?: Record<string, unknown>
  custom_field_snapshot?: Record<string, unknown>
  published_metadata_fields?: string[]
  published_custom_field_ids?: string[]
  status?: "scheduled" | "published" | "cancelled"
  scheduled_at?: string
  published_at?: string
  last_upstream_metadata_hash?: string
}

export type DataroomRelease = {
  release_id: string
  dataroom_id: string
  version: number
  status: "scheduled" | "published" | "cancelled"
  scheduled_at?: string
  published_at?: string
  published_by_subject_id?: string
  manifest?: DataroomReleaseItem[]
  pdf_bundle_status?: string
  created_at?: string
  updated_at?: string
}

export type DataroomSummaryCount = {
  event_type: string
  count: number
}

export type DataroomInviteeStats = {
  invitee_id: string
  email: string
  invited_at: string
  activated_at?: string
  links_issued: number
  last_link_issued?: string
  last_access_at?: string
  access_count: number
  documents_viewed: number
}
