import type {
  AttributeUsage,
  ContextProfile,
  EntityType,
  EntityUsage,
  ExampleDocumentRef,
  Qualifier,
  TaxonomyNode,
} from "@/lib/link-iq-types"

export type DocumentTypeOption = {
  id: number
  name: string
}

export type DomainModelsWorkbenchProps = {
  initialContextProfiles: ContextProfile[]
  initialTaxonomyNodes: TaxonomyNode[]
  initialDocumentTypes: DocumentTypeOption[]
  initialEntityTypes: EntityType[]
  initialQualifiers: Qualifier[]
  sourceID: string
}

export type ProfileDraft = {
  description: string
  document_type: string
  entity_usages: EntityUsage[]
  example_documents: ExampleDocumentRef[]
  label: string
  profile_id: string
  source_id: string
  source_scope: string
  status: string
  taxonomy_node_id: string
}

export type AttributeTypeDraft = {
  _client_id: string
  allowed_qualifier_ids: string[]
  attribute_type_id: string
  cardinality: string
  description: string
  label: string
  name: string
  required: boolean
  target_entity_type_id: string
  value_type: string
}

export type EntityTypeDraft = {
  attributes: AttributeTypeDraft[]
  description: string
  entity_type_id: string
  label: string
  source_id: string
  source_scope: string
  status: string
}

export type ScopeOption = {
  label: string
  value: string
}

export type SelectOption = {
  label: string
  value: string
}

export type ComposerMode = "contextual" | "canonical"

export type InspectorTarget =
  | { kind: "profile" }
  | { kind: "entity_type" }
  | { kind: "attribute_type" }
  | { kind: "entity_usage" }
  | { kind: "attribute_usage" }

export type AttributeUsageSelection = {
  attributeUsage: AttributeUsage | null
  entityUsage: EntityUsage | null
}
