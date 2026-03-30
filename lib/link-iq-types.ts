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
  label: string
  model_name: string
  model_type: string
  description?: string
  max_context_tokens?: number
  max_output_tokens?: number
  temperature?: number
  top_p?: number
  status: string
  created_at?: string
  updated_at?: string
}

export type AIProcessConfig = {
  process_key: string
  section: string
  label: string
  description?: string
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
