"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { deleteJson, getJson, postJson, withQuery } from "@/lib/paperless-client"
import type {
  AttributeType,
  AttributeUsage,
  ContextProfile,
  EntityType,
  EntityUsage,
  ExampleDocument,
  ExampleDocumentRef,
  Qualifier,
  TaxonomyNode,
} from "@/lib/link-iq-types"
import { DomainExplorerScreen } from "./domain-explorer-screen"
import { DomainModelsOverviewCards } from "./overview-cards"
import { EntityLibraryScreen } from "./entity-library-screen"
import { DomainModelsSectionSwitcher, type DomainModelsSection } from "./workspace-section-switcher"
import type {
  AttributeTypeDraft,
  ComposerMode,
  DomainModelsWorkbenchProps,
  InspectorTarget,
  ProfileDraft,
} from "./types"

const scopeOptions = [
  { label: "Link Global", value: "link_global" },
  { label: "Source Specific", value: "source_specific" },
  { label: "Source Aligned", value: "source_aligned" },
]

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
]

const applicabilityOptions = [
  { label: "Allowed", value: "allowed" },
  { label: "Preferred", value: "preferred" },
  { label: "Required", value: "required" },
]

const cardinalityOptions = [
  { label: "One", value: "one" },
  { label: "Many", value: "many" },
]

const attributeValueTypeOptions = [
  "string",
  "number",
  "date",
  "boolean",
  "currency",
  "reference",
  "email",
  "url",
]

function makeClientID(prefix: string) {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return prefix + "-" + random
}

function taxonomyRootFromPath(path?: string | null) {
  const value = String(path || "").trim()
  if (!value) return ""

  const separators = [" / ", " > ", "/", ">"]
  for (const separator of separators) {
    if (value.includes(separator)) {
      return value.split(separator)[0]?.trim() || value
    }
  }

  return value
}

function sortProfiles(profiles: ContextProfile[]) {
  return [...profiles].sort((left, right) => {
    const leftKey = (left.taxonomy_path || "") + " " + (left.document_type || "") + " " + left.label
    const rightKey = (right.taxonomy_path || "") + " " + (right.document_type || "") + " " + right.label
    return leftKey.localeCompare(rightKey)
  })
}

function cloneEntityUsages(entityUsages: EntityUsage[] | undefined) {
  return (entityUsages ?? []).map((entityUsage) => ({
    ...entityUsage,
    qualifier_ids: [...(entityUsage.qualifier_ids ?? [])],
    attributes: (entityUsage.attributes ?? []).map((attribute) => ({
      ...attribute,
      qualifier_ids: [...(attribute.qualifier_ids ?? [])],
    })),
  }))
}

function cloneAttributeTypes(attributeTypes: AttributeType[] | undefined) {
  return (attributeTypes ?? []).map((attributeType, index) => ({
    _client_id: attributeType.attribute_type_id
      ? "attribute-type-" + attributeType.attribute_type_id
      : "attribute-index-" + index,
    allowed_qualifier_ids: [...(attributeType.allowed_qualifier_ids ?? [])],
    attribute_type_id: attributeType.attribute_type_id,
    cardinality: attributeType.cardinality || "one",
    description: attributeType.description ?? "",
    label: attributeType.label ?? "",
    name: attributeType.name ?? "",
    required: Boolean(attributeType.required),
    target_entity_type_id: attributeType.target_entity_type_id ?? "",
    value_type: attributeType.value_type || "string",
  }))
}

function normalizeExampleDocuments(exampleDocuments: ExampleDocumentRef[] | undefined) {
  const seen = new Set<string>()
  const normalized: ExampleDocumentRef[] = []

  for (const exampleDocument of exampleDocuments ?? []) {
    const documentID = String(exampleDocument.document_id || "").trim()
    if (!documentID) continue
    const sourceID = String(exampleDocument.source_id || "").trim()
    const dedupeKey = sourceID + ":" + documentID
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    normalized.push({
      document_id: documentID,
      source_id: sourceID || undefined,
      title: String(exampleDocument.title || "").trim() || undefined,
    })
  }

  return normalized
}

function buildDraft(profile: ContextProfile | null, sourceID: string): ProfileDraft {
  if (!profile) {
    return {
      description: "",
      document_type: "",
      entity_usages: [],
      example_documents: [],
      label: "",
      profile_id: "",
      source_id: "",
      source_scope: "link_global",
      status: "active",
      taxonomy_node_id: "",
    }
  }

  return {
    description: profile.description ?? "",
    document_type: profile.document_type ?? "",
    entity_usages: cloneEntityUsages(profile.entity_usages),
    example_documents: normalizeExampleDocuments(profile.example_documents),
    label: profile.label ?? "",
    profile_id: profile.profile_id,
    source_id: profile.source_scope === "link_global" ? "" : profile.source_id || sourceID,
    source_scope: profile.source_scope || "link_global",
    status: profile.status || "active",
    taxonomy_node_id: profile.taxonomy_node_id ?? "",
  }
}

function serializeDraft(draft: ProfileDraft) {
  return JSON.stringify({
    ...draft,
    description: draft.description.trim(),
    document_type: draft.document_type.trim(),
    entity_usages: cloneEntityUsages(draft.entity_usages),
    example_documents: normalizeExampleDocuments(draft.example_documents),
    label: draft.label.trim(),
    source_id: draft.source_scope === "link_global" ? "" : draft.source_id.trim(),
    taxonomy_node_id: draft.taxonomy_node_id.trim(),
  })
}

function buildEntityTypeDraft(entityType: EntityType | null, sourceID: string) {
  if (!entityType) {
    return {
      attributes: [],
      description: "",
      entity_type_id: "",
      label: "",
      source_id: "",
      source_scope: "link_global",
      status: "active",
    }
  }

  return {
    attributes: cloneAttributeTypes(entityType.attributes),
    description: entityType.description ?? "",
    entity_type_id: entityType.entity_type_id,
    label: entityType.label ?? "",
    source_id: entityType.source_scope === "link_global" ? "" : entityType.source_id || sourceID,
    source_scope: entityType.source_scope || "link_global",
    status: entityType.status || "active",
  }
}

function serializeEntityTypeDraft(draft: ReturnType<typeof buildEntityTypeDraft>) {
  return JSON.stringify({
    ...draft,
    attributes: draft.attributes.map((attribute) => ({
      allowed_qualifier_ids: [...attribute.allowed_qualifier_ids].sort(),
      attribute_type_id: attribute.attribute_type_id,
      cardinality: attribute.cardinality,
      description: attribute.description.trim(),
      label: attribute.label.trim(),
      name: attribute.name.trim(),
      required: attribute.required,
      target_entity_type_id: attribute.target_entity_type_id.trim(),
      value_type: attribute.value_type,
    })),
    description: draft.description.trim(),
    label: draft.label.trim(),
    source_id: draft.source_scope === "link_global" ? "" : draft.source_id.trim(),
  })
}

function emptyAttributeTypeDraft() {
  return {
    _client_id: makeClientID("attribute"),
    allowed_qualifier_ids: [],
    attribute_type_id: "",
    cardinality: "one",
    description: "",
    label: "",
    name: "",
    required: false,
    target_entity_type_id: "",
    value_type: "string",
  }
}

function attributeUsageFromType(attributeType: AttributeType): AttributeUsage {
  return {
    applicability: attributeType.required ? "required" : "allowed",
    attribute_type_id: attributeType.attribute_type_id,
    description: attributeType.description ?? "",
    label: attributeType.label,
    qualifier_ids: [],
    required: Boolean(attributeType.required),
    usage_id: makeClientID(attributeType.attribute_type_id || "attribute"),
  }
}

function entityUsageFromType(entityType: EntityType): EntityUsage {
  return {
    applicability: "allowed",
    attributes: (entityType.attributes ?? []).map(attributeUsageFromType),
    cardinality: "one",
    description: entityType.description ?? "",
    entity_type_id: entityType.entity_type_id,
    label: entityType.label,
    qualifier_ids: [],
    required: false,
    usage_id: makeClientID(entityType.entity_type_id || "entity"),
  }
}

function valueToDisplay(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value)
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => valueToDisplay(item)).filter(Boolean).slice(0, 6)
    return parts.join(", ")
  }
  if (typeof value === "object") {
    return JSON.stringify(value)
  }
  return ""
}

function extractDocumentContent(document: ExampleDocument | null) {
  const result = document?.result
  if (!result) return ""
  const directContent = valueToDisplay(result.content)
  if (directContent) return directContent
  return valueToDisplay(result.notes) || valueToDisplay(result.original_text)
}

function buildDocumentSummary(document: ExampleDocument | null) {
  const result = document?.result
  if (!result) return []

  const preferredKeys = [
    "title",
    "document_type",
    "correspondent",
    "created",
    "added",
    "modified",
    "archive_serial_number",
    "original_filename",
    "storage_path",
    "owner",
  ]

  return preferredKeys
    .map((key) => ({
      key,
      label: key.replaceAll("_", " "),
      value: valueToDisplay(result[key]),
    }))
    .filter((row) => row.value)
}

export function DomainModelsWorkbench({
  initialContextProfiles,
  initialTaxonomyNodes,
  initialDocumentTypes,
  initialEntityTypes,
  initialQualifiers,
  sourceID,
}: DomainModelsWorkbenchProps) {
  const [contextProfiles, setContextProfiles] = React.useState(() => sortProfiles(initialContextProfiles))
  const [entityTypes, setEntityTypes] = React.useState(() => initialEntityTypes)
  const [selectedProfileID, setSelectedProfileID] = React.useState(initialContextProfiles[0]?.profile_id ?? "__new__")
  const [selectedEntityTypeID, setSelectedEntityTypeID] = React.useState(initialEntityTypes[0]?.entity_type_id ?? "__new__")
  const [draft, setDraft] = React.useState(() => buildDraft(initialContextProfiles[0] ?? null, sourceID))
  const [entityTypeDraft, setEntityTypeDraft] = React.useState(() => buildEntityTypeDraft(initialEntityTypes[0] ?? null, sourceID))
  const [search, setSearch] = React.useState("")
  const [entityTypeSearch, setEntityTypeSearch] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)
  const [savingEntityType, setSavingEntityType] = React.useState(false)
  const [deletingEntityType, setDeletingEntityType] = React.useState(false)
  const [refreshingEntityTypes, setRefreshingEntityTypes] = React.useState(false)
  const [pendingEntityTypeID, setPendingEntityTypeID] = React.useState(initialEntityTypes[0]?.entity_type_id ?? "")
  const [selectedTaxonomyRoot, setSelectedTaxonomyRoot] = React.useState("__all__")
  const [composerMode, setComposerMode] = React.useState<ComposerMode>("contextual")
  const [activeSection, setActiveSection] = React.useState<DomainModelsSection>("explorer")
  const [selectedEntityUsageID, setSelectedEntityUsageID] = React.useState("")
  const [selectedAttributeUsageID, setSelectedAttributeUsageID] = React.useState("")
  const [selectedAttributeTypeID, setSelectedAttributeTypeID] = React.useState("")
  const [exampleDocuments, setExampleDocuments] = React.useState<ExampleDocument[]>([])
  const [selectedExampleDocumentID, setSelectedExampleDocumentID] = React.useState("")
  const [exampleDocumentSearch, setExampleDocumentSearch] = React.useState("")
  const [loadingExampleDocuments, setLoadingExampleDocuments] = React.useState(false)
  const [selectedExampleDocument, setSelectedExampleDocument] = React.useState<ExampleDocument | null>(null)
  const [applyingSuggestions, setApplyingSuggestions] = React.useState(false)

  const taxonomyNodesByID = React.useMemo(
    () => Object.fromEntries(initialTaxonomyNodes.map((node) => [node.taxonomy_node_id, node])),
    [initialTaxonomyNodes]
  )

  const selectedProfile = React.useMemo(
    () => contextProfiles.find((profile) => profile.profile_id === selectedProfileID) ?? null,
    [contextProfiles, selectedProfileID]
  )

  const selectedEntityType = React.useMemo(
    () => entityTypes.find((entityType) => entityType.entity_type_id === selectedEntityTypeID) ?? null,
    [entityTypes, selectedEntityTypeID]
  )

  const entityTypesByID = React.useMemo(
    () => Object.fromEntries(entityTypes.map((entityType) => [entityType.entity_type_id, entityType])),
    [entityTypes]
  )

  const qualifiersByID = React.useMemo(
    () => Object.fromEntries(initialQualifiers.map((qualifier) => [qualifier.qualifier_id, qualifier])),
    [initialQualifiers]
  )

  React.useEffect(() => {
    setDraft(buildDraft(selectedProfile, sourceID))
  }, [selectedProfile, sourceID])

  React.useEffect(() => {
    setEntityTypeDraft(buildEntityTypeDraft(selectedEntityType, sourceID))
  }, [selectedEntityType, sourceID])

  const taxonomyRootOptions = React.useMemo(() => {
    return [...new Set(initialTaxonomyNodes.map((node) => taxonomyRootFromPath(node.path)).filter(Boolean))].sort(
      (left, right) => left.localeCompare(right)
    )
  }, [initialTaxonomyNodes])

  const filteredTaxonomyNodes = React.useMemo(() => {
    if (selectedTaxonomyRoot === "__all__") return initialTaxonomyNodes
    return initialTaxonomyNodes.filter(
      (node) => taxonomyRootFromPath(node.path) === selectedTaxonomyRoot
    )
  }, [initialTaxonomyNodes, selectedTaxonomyRoot])

  const filteredProfiles = React.useMemo(() => {
    const query = search.trim().toLowerCase()

    return contextProfiles.filter((profile) => {
      const profilePath =
        profile.taxonomy_path || taxonomyNodesByID[profile.taxonomy_node_id || ""]?.path || ""
      const rootMatches =
        selectedTaxonomyRoot === "__all__" || taxonomyRootFromPath(profilePath) === selectedTaxonomyRoot

      if (!rootMatches) return false
      if (!query) return true

      const searchable = [
        profile.label,
        profilePath,
        profile.document_type,
        ...(profile.entity_usages ?? []).map((entityUsage) => entityUsage.label),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return searchable.includes(query)
    })
  }, [contextProfiles, search, selectedTaxonomyRoot, taxonomyNodesByID])

  React.useEffect(() => {
    if (selectedProfileID === "__new__") return
    if (filteredProfiles.some((profile) => profile.profile_id === selectedProfileID)) return
    setSelectedProfileID(filteredProfiles[0]?.profile_id ?? "__new__")
  }, [filteredProfiles, selectedProfileID])

  const filteredEntityTypes = React.useMemo(() => {
    const query = entityTypeSearch.trim().toLowerCase()
    if (!query) return entityTypes

    return entityTypes.filter((entityType) => {
      const searchable = [
        entityType.label,
        entityType.description,
        ...(entityType.attributes ?? []).map((attribute) => attribute.label),
        ...(entityType.attributes ?? []).map((attribute) => attribute.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return searchable.includes(query)
    })
  }, [entityTypes, entityTypeSearch])

  const taxonomyPath = React.useMemo(
    () => taxonomyNodesByID[draft.taxonomy_node_id]?.path ?? "",
    [draft.taxonomy_node_id, taxonomyNodesByID]
  )

  const suggestedEntityTypes = React.useMemo(() => {
    const existingEntityTypeIDs = new Set(
      draft.entity_usages.map((usage) => usage.entity_type_id)
    )
    const contextTokens = [
      draft.document_type,
      taxonomyPath,
      draft.label,
      selectedProfile?.label,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2)

    if (contextTokens.length === 0) return []

    return entityTypes
      .filter((entityType) => !existingEntityTypeIDs.has(entityType.entity_type_id))
      .map((entityType) => {
        const searchable = `${entityType.label} ${entityType.description || ""}`.toLowerCase()
        const score = contextTokens.reduce((sum, token) => {
          return sum + (searchable.includes(token) ? 1 : 0)
        }, 0)
        return { entityType, score }
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.entityType.label.localeCompare(right.entityType.label))
      .slice(0, 5)
      .map((entry) => entry.entityType)
  }, [draft.document_type, draft.entity_usages, draft.label, entityTypes, selectedProfile?.label, taxonomyPath])

  const totalEntityUsageCount = React.useMemo(
    () => contextProfiles.reduce((count, profile) => count + (profile.entity_usages?.length ?? 0), 0),
    [contextProfiles]
  )

  const totalAttributeUsageCount = React.useMemo(
    () =>
      contextProfiles.reduce((count, profile) => {
        return (
          count +
          (profile.entity_usages ?? []).reduce((entityCount, entityUsage) => {
            return entityCount + (entityUsage.attributes?.length ?? 0)
          }, 0)
        )
      }, 0),
    [contextProfiles]
  )

  const isDirty = React.useMemo(() => {
    return serializeDraft(draft) !== serializeDraft(buildDraft(selectedProfile, sourceID))
  }, [draft, selectedProfile, sourceID])

  const isEntityTypeDirty = React.useMemo(() => {
    return (
      serializeEntityTypeDraft(entityTypeDraft) !==
      serializeEntityTypeDraft(buildEntityTypeDraft(selectedEntityType, sourceID))
    )
  }, [entityTypeDraft, selectedEntityType, sourceID])

  const draftContextQuery = React.useMemo(
    () =>
      withQuery("/api/link-iq/example-documents", {
        document_type: draft.document_type || null,
        limit: 8,
        query: exampleDocumentSearch || null,
        source_id: sourceID,
        taxonomy_node_id: draft.taxonomy_node_id || null,
      }),
    [draft.document_type, draft.taxonomy_node_id, exampleDocumentSearch, sourceID]
  )

  const boundExampleDocumentIDs = React.useMemo(
    () => new Set(draft.example_documents.map((document) => document.document_id)),
    [draft.example_documents]
  )

  const selectedEntityUsage = React.useMemo(
    () => draft.entity_usages.find((entityUsage) => entityUsage.usage_id === selectedEntityUsageID) ?? null,
    [draft.entity_usages, selectedEntityUsageID]
  )

  const selectedAttributeUsage = React.useMemo(() => {
    if (!selectedEntityUsage) {
      return { attributeUsage: null, entityUsage: null }
    }

    return {
      attributeUsage:
        selectedEntityUsage.attributes?.find((attributeUsage) => attributeUsage.usage_id === selectedAttributeUsageID) ??
        null,
      entityUsage: selectedEntityUsage,
    }
  }, [selectedAttributeUsageID, selectedEntityUsage])

  const selectedAttributeType = React.useMemo(
    () => entityTypeDraft.attributes.find((attribute) => attribute._client_id === selectedAttributeTypeID) ?? null,
    [entityTypeDraft.attributes, selectedAttributeTypeID]
  )

  React.useEffect(() => {
    if (draft.entity_usages.length === 0) {
      setSelectedEntityUsageID("")
      setSelectedAttributeUsageID("")
      return
    }

    if (!draft.entity_usages.some((entityUsage) => entityUsage.usage_id === selectedEntityUsageID)) {
      setSelectedEntityUsageID(draft.entity_usages[0]?.usage_id ?? "")
    }
  }, [draft.entity_usages, selectedEntityUsageID])

  React.useEffect(() => {
    if (!selectedEntityUsage) {
      setSelectedAttributeUsageID("")
      return
    }

    if (
      selectedAttributeUsageID &&
      selectedEntityUsage.attributes?.some((attributeUsage) => attributeUsage.usage_id === selectedAttributeUsageID)
    ) {
      return
    }

    setSelectedAttributeUsageID(selectedEntityUsage.attributes?.[0]?.usage_id ?? "")
  }, [selectedAttributeUsageID, selectedEntityUsage])

  React.useEffect(() => {
    if (entityTypeDraft.attributes.length === 0) {
      setSelectedAttributeTypeID("")
      return
    }

    if (entityTypeDraft.attributes.some((attribute) => attribute._client_id === selectedAttributeTypeID)) {
      return
    }

    setSelectedAttributeTypeID(entityTypeDraft.attributes[0]?._client_id ?? "")
  }, [entityTypeDraft.attributes, selectedAttributeTypeID])

  const inspectorTarget = React.useMemo<InspectorTarget>(() => {
    if (composerMode === "canonical") {
      if (selectedAttributeType) return { kind: "attribute_type" }
      return { kind: "entity_type" }
    }

    if (selectedAttributeUsage.attributeUsage) return { kind: "attribute_usage" }
    if (selectedEntityUsage) return { kind: "entity_usage" }
    return { kind: "profile" }
  }, [composerMode, selectedAttributeType, selectedAttributeUsage.attributeUsage, selectedEntityUsage])

  async function reloadProfiles(nextProfileID?: string) {
    setRefreshing(true)
    try {
      const response = await getJson<{ context_profiles?: ContextProfile[] }>("/api/link-iq/domain-models")
      const nextProfiles = sortProfiles(response.context_profiles ?? [])
      setContextProfiles(nextProfiles)

      if (nextProfileID === "__new__") {
        setSelectedProfileID("__new__")
        return
      }

      const fallbackProfileID = nextProfiles[0]?.profile_id ?? "__new__"
      const resolvedProfileID =
        nextProfileID && nextProfiles.some((profile) => profile.profile_id === nextProfileID)
          ? nextProfileID
          : selectedProfileID !== "__new__" &&
              nextProfiles.some((profile) => profile.profile_id === selectedProfileID)
            ? selectedProfileID
            : fallbackProfileID

      setSelectedProfileID(resolvedProfileID)
    } catch (error) {
      toast.error("Failed to reload context profiles", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setRefreshing(false)
    }
  }

  async function reloadEntityTypes(nextEntityTypeID?: string) {
    setRefreshingEntityTypes(true)
    try {
      const response = await getJson<{ entity_types?: EntityType[] }>("/api/link-iq/entity-types")
      const nextEntityTypes = response.entity_types ?? []
      setEntityTypes(nextEntityTypes)

      if (nextEntityTypeID === "__new__") {
        setSelectedEntityTypeID("__new__")
        return
      }

      const fallbackEntityTypeID = nextEntityTypes[0]?.entity_type_id ?? "__new__"
      const resolvedEntityTypeID =
        nextEntityTypeID && nextEntityTypes.some((entityType) => entityType.entity_type_id === nextEntityTypeID)
          ? nextEntityTypeID
          : selectedEntityTypeID !== "__new__" &&
              nextEntityTypes.some((entityType) => entityType.entity_type_id === selectedEntityTypeID)
            ? selectedEntityTypeID
            : fallbackEntityTypeID

      setSelectedEntityTypeID(resolvedEntityTypeID)
      if (!pendingEntityTypeID && resolvedEntityTypeID !== "__new__") {
        setPendingEntityTypeID(resolvedEntityTypeID)
      }
    } catch (error) {
      toast.error("Failed to reload entity types", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setRefreshingEntityTypes(false)
    }
  }

  async function loadExampleDocuments() {
    if (!draft.taxonomy_node_id && !draft.document_type) {
      setExampleDocuments([])
      setSelectedExampleDocument(null)
      setSelectedExampleDocumentID("")
      return
    }

    setLoadingExampleDocuments(true)
    try {
      const response = await getJson<{ documents?: ExampleDocument[] }>(draftContextQuery)
      const documents = response.documents ?? []
      setExampleDocuments(documents)

      const preferredDocumentID = draft.example_documents[0]?.document_id || documents[0]?.document_id || ""
      setSelectedExampleDocumentID((current) => current || preferredDocumentID)
    } catch (error) {
      toast.error("Failed to load example documents", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
      setExampleDocuments([])
    } finally {
      setLoadingExampleDocuments(false)
    }
  }

  React.useEffect(() => {
    void loadExampleDocuments()
  }, [draftContextQuery])

  React.useEffect(() => {
    const inlineDocument = exampleDocuments.find((document) => document.document_id === selectedExampleDocumentID) ?? null

    if (inlineDocument?.result) {
      setSelectedExampleDocument(inlineDocument)
      return
    }

    if (!selectedExampleDocumentID) {
      setSelectedExampleDocument(null)
      return
    }

    let cancelled = false
    void getJson<{ document?: ExampleDocument }>(
      withQuery("/api/link-iq/example-documents", {
        document_id: selectedExampleDocumentID,
        source_id: sourceID,
      })
    )
      .then((response) => {
        if (cancelled) return
        setSelectedExampleDocument(response.document ?? null)
      })
      .catch(() => {
        if (cancelled) return
        setSelectedExampleDocument(null)
      })

    return () => {
      cancelled = true
    }
  }, [exampleDocuments, selectedExampleDocumentID, sourceID])

  function applyStoredProfile(profile: ContextProfile) {
    setContextProfiles((current) =>
      sortProfiles([...current.filter((candidate) => candidate.profile_id != profile.profile_id), profile])
    )

    if (selectedProfileID == profile.profile_id) {
      setDraft(buildDraft(profile, sourceID))
    }
  }

  async function mutateStoredProfile(
    payload: Record<string, unknown>,
    failureTitle: string
  ) {
    if (!selectedProfile?.profile_id) return null

    try {
      const profile = await postJson<ContextProfile>(
        "/api/link-iq/domain-models/" + selectedProfile.profile_id + "/mutate",
        payload
      )
      applyStoredProfile(profile)
      return profile
    } catch (error) {
      toast.error(failureTitle, {
        description: error instanceof Error ? error.message : "Unknown error",
      })
      return null
    }
  }

  function updateEntityUsage(usageID: string, updater: (entityUsage: EntityUsage) => EntityUsage) {
    setDraft((current) => ({
      ...current,
      entity_usages: current.entity_usages.map((entityUsage) =>
        entityUsage.usage_id === usageID ? updater(entityUsage) : entityUsage
      ),
    }))
  }

  function updateAttributeUsage(
    entityUsageID: string,
    attributeUsageID: string,
    updater: (attributeUsage: AttributeUsage) => AttributeUsage
  ) {
    updateEntityUsage(entityUsageID, (entityUsage) => ({
      ...entityUsage,
      attributes: (entityUsage.attributes ?? []).map((attributeUsage) =>
        attributeUsage.usage_id === attributeUsageID ? updater(attributeUsage) : attributeUsage
      ),
    }))
  }

  function moveEntityUsage(usageID: string, direction: -1 | 1) {
    const index = draft.entity_usages.findIndex((entityUsage) => entityUsage.usage_id === usageID)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= draft.entity_usages.length) {
      return
    }

    if (!selectedProfile?.profile_id) {
      setDraft((current) => {
        const nextEntityUsages = [...current.entity_usages]
        const [entityUsage] = nextEntityUsages.splice(index, 1)
        nextEntityUsages.splice(nextIndex, 0, entityUsage)

        return {
          ...current,
          entity_usages: nextEntityUsages,
        }
      })
      return
    }

    void mutateStoredProfile(
      {
        action: "entity_reorder",
        target_index: nextIndex,
        usage_id: usageID,
      },
      "Failed to reorder entity usage"
    )
  }

  function moveAttributeUsage(entityUsageID: string, attributeUsageID: string, direction: -1 | 1) {
    const entityUsage = draft.entity_usages.find((usage) => usage.usage_id === entityUsageID)
    const attributes = [...(entityUsage?.attributes ?? [])]
    const index = attributes.findIndex((attributeUsage) => attributeUsage.usage_id === attributeUsageID)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= attributes.length) {
      return
    }

    if (!selectedProfile?.profile_id) {
      updateEntityUsage(entityUsageID, (current) => {
        const nextAttributes = [...(current.attributes ?? [])]
        const [attributeUsage] = nextAttributes.splice(index, 1)
        nextAttributes.splice(nextIndex, 0, attributeUsage)

        return {
          ...current,
          attributes: nextAttributes,
        }
      })
      return
    }

    void mutateStoredProfile(
      {
        action: "attribute_reorder",
        attribute_usage_id: attributeUsageID,
        entity_usage_id: entityUsageID,
        target_index: nextIndex,
      },
      "Failed to reorder attribute usage"
    )
  }

  function addEntityUsage(entityTypeID: string) {
    const entityType = entityTypesByID[entityTypeID]
    if (!entityType) return

    const nextUsage = entityUsageFromType(entityType)

    if (!selectedProfile?.profile_id) {
      setDraft((current) => ({
        ...current,
        entity_usages: [...current.entity_usages, nextUsage],
      }))
    } else {
      void mutateStoredProfile(
        {
          action: "entity_upsert",
          index: draft.entity_usages.length,
          usage: nextUsage,
        },
        "Failed to add entity usage"
      )
    }

    setSelectedEntityUsageID(nextUsage.usage_id)
    setSelectedAttributeUsageID(nextUsage.attributes?.[0]?.usage_id ?? "")
    setComposerMode("contextual")
  }

  async function applySuggestedEntityTypes() {
    if (suggestedEntityTypes.length === 0) return
    setApplyingSuggestions(true)
    try {
      const existing = new Set(draft.entity_usages.map((usage) => usage.entity_type_id))
      for (const entityType of suggestedEntityTypes) {
        if (existing.has(entityType.entity_type_id)) continue
        addEntityUsage(entityType.entity_type_id)
      }
      toast.success("Applied domain model suggestions")
    } finally {
      setApplyingSuggestions(false)
    }
  }

  function deleteEntityUsage(usageID: string) {
    if (!selectedProfile?.profile_id) {
      setDraft((current) => ({
        ...current,
        entity_usages: current.entity_usages.filter((usage) => usage.usage_id !== usageID),
      }))
      return
    }

    void mutateStoredProfile(
      {
        action: "entity_delete",
        usage_id: usageID,
      },
      "Failed to delete entity usage"
    )
  }

  function deleteAttributeUsage(entityUsageID: string, attributeUsageID: string) {
    if (!selectedProfile?.profile_id) {
      updateEntityUsage(entityUsageID, (current) => ({
        ...current,
        attributes: (current.attributes ?? []).filter((usage) => usage.usage_id !== attributeUsageID),
      }))
      return
    }

    void mutateStoredProfile(
      {
        action: "attribute_delete",
        attribute_usage_id: attributeUsageID,
        entity_usage_id: entityUsageID,
      },
      "Failed to delete attribute usage"
    )
  }

  function updateAttributeTypeDraft(
    attributeClientID: string,
    updater: (attribute: AttributeTypeDraft) => AttributeTypeDraft
  ) {
    setEntityTypeDraft((current) => ({
      ...current,
      attributes: current.attributes.map((attribute) =>
        attribute._client_id === attributeClientID ? updater(attribute) : attribute
      ),
    }))
  }

  function toggleBoundExampleDocument(document: ExampleDocument, checked: boolean) {
    setDraft((current) => {
      const nextExampleDocuments = checked
        ? normalizeExampleDocuments([
            ...current.example_documents,
            {
              document_id: document.document_id,
              source_id: document.source_id,
              title: document.title,
            },
          ])
        : current.example_documents.filter(
            (exampleDocument) => exampleDocument.document_id !== document.document_id
          )

      return {
        ...current,
        example_documents: nextExampleDocuments,
      }
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const profile = await postJson<ContextProfile>("/api/link-iq/domain-models", {
        description: draft.description.trim() || undefined,
        document_type: draft.document_type.trim() || undefined,
        entity_usages: draft.entity_usages.map((entityUsage) => ({
          ...entityUsage,
          description: entityUsage.description?.trim() || undefined,
          label: entityUsage.label?.trim() || undefined,
          qualifier_ids: entityUsage.qualifier_ids?.length ? entityUsage.qualifier_ids : undefined,
          attributes: (entityUsage.attributes ?? []).map((attributeUsage) => ({
            ...attributeUsage,
            description: attributeUsage.description?.trim() || undefined,
            label: attributeUsage.label?.trim() || undefined,
            qualifier_ids: attributeUsage.qualifier_ids?.length ? attributeUsage.qualifier_ids : undefined,
          })),
        })),
        example_documents: normalizeExampleDocuments(draft.example_documents),
        label: draft.label.trim(),
        profile_id: draft.profile_id || undefined,
        source_id:
          draft.source_scope === "link_global" ? undefined : draft.source_id.trim() || sourceID,
        source_scope: draft.source_scope,
        status: draft.status,
        taxonomy_node_id: draft.taxonomy_node_id.trim() || undefined,
      })

      toast.success(draft.profile_id ? "Context profile updated" : "Context profile created")
      await reloadProfiles(profile.profile_id)
    } catch (error) {
      toast.error("Failed to save context profile", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEntityType() {
    setSavingEntityType(true)
    try {
      const entityType = await postJson<EntityType>("/api/link-iq/entity-types", {
        attributes: entityTypeDraft.attributes.map((attribute) => ({
          allowed_qualifier_ids: attribute.allowed_qualifier_ids.length ? attribute.allowed_qualifier_ids : undefined,
          attribute_type_id: attribute.attribute_type_id.trim() || undefined,
          cardinality: attribute.cardinality,
          description: attribute.description.trim() || undefined,
          label: attribute.label.trim() || undefined,
          name: attribute.name.trim() || undefined,
          required: attribute.required || undefined,
          target_entity_type_id: attribute.target_entity_type_id.trim() || undefined,
          value_type: attribute.value_type,
        })),
        description: entityTypeDraft.description.trim() || undefined,
        entity_type_id: entityTypeDraft.entity_type_id || undefined,
        label: entityTypeDraft.label.trim(),
        source_id:
          entityTypeDraft.source_scope === "link_global"
            ? undefined
            : entityTypeDraft.source_id.trim() || sourceID,
        source_scope: entityTypeDraft.source_scope,
        status: entityTypeDraft.status,
      })

      toast.success(entityTypeDraft.entity_type_id ? "Entity type updated" : "Entity type created")
      setPendingEntityTypeID(entityType.entity_type_id)
      await reloadEntityTypes(entityType.entity_type_id)
    } catch (error) {
      toast.error("Failed to save entity type", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSavingEntityType(false)
    }
  }

  async function handleDelete() {
    if (!selectedProfile) return
    setDeleting(true)
    try {
      await deleteJson("/api/link-iq/domain-models/" + selectedProfile.profile_id)
      toast.success("Context profile deleted")
      await reloadProfiles("__new__")
    } catch (error) {
      toast.error("Failed to delete context profile", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteEntityType() {
    if (!selectedEntityType) return
    setDeletingEntityType(true)
    try {
      await deleteJson("/api/link-iq/entity-types/" + selectedEntityType.entity_type_id)
      toast.success("Entity type deleted")
      await reloadEntityTypes("__new__")
      setPendingEntityTypeID("")
    } catch (error) {
      toast.error("Failed to delete entity type", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDeletingEntityType(false)
    }
  }

  function handleSectionChange(section: DomainModelsSection) {
    setActiveSection(section)
    setComposerMode(section === "library" ? "canonical" : "contextual")
  }

  const contextPaneProps = {
    filteredProfiles,
    refreshing,
    search,
    selectedProfileID,
    selectedTaxonomyRoot,
    taxonomyRootOptions,
    onNew: () => setSelectedProfileID("__new__"),
    onRefresh: () => void reloadProfiles(),
    onSearchChange: setSearch,
    onSelectProfile: setSelectedProfileID,
    onTaxonomyRootChange: setSelectedTaxonomyRoot,
  }

  const inspectorPaneProps = {
    boundExampleDocumentIDs,
    deleting,
    draft,
    entityTypeDraft,
    filteredTaxonomyNodes,
    initialDocumentTypes,
    inspectorTarget,
    isDirty,
    qualifiersByID,
    saving,
    scopeOptions,
    selectedAttributeType,
    selectedAttributeUsage,
    selectedEntityType,
    selectedEntityUsage,
    selectedProfile,
    sourceID,
    statusOptions,
    taxonomyPath,
    onDelete: () => void handleDelete(),
    onSave: () => void handleSave(),
    onSetDraft: setDraft,
  }

  const evidencePaneProps = {
    boundExampleDocumentIDs,
    buildDocumentSummary,
    exampleDocumentSearch,
    exampleDocuments,
    extractDocumentContent,
    loadingExampleDocuments,
    onExampleDocumentSearchChange: setExampleDocumentSearch,
    onLoadExampleDocuments: () => void loadExampleDocuments(),
    onSelectedExampleDocumentIDChange: setSelectedExampleDocumentID,
    onToggleBoundExampleDocument: toggleBoundExampleDocument,
    selectedExampleDocument,
    selectedExampleDocumentID,
    sourceID,
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
      <DomainModelsOverviewCards
        attributeUsageCount={totalAttributeUsageCount}
        entityTypeCount={entityTypes.length}
        entityUsageCount={totalEntityUsageCount}
        profileCount={contextProfiles.length}
        qualifierCount={initialQualifiers.length}
      />

      <DomainModelsSectionSwitcher
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />

      <Card>
        <CardHeader>
          <CardTitle>Suggestions</CardTitle>
          <CardDescription>
            Suggested entity usages based on taxonomy path, profile label, and document type.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {suggestedEntityTypes.length > 0 ? (
            <>
              {suggestedEntityTypes.map((entityType) => (
                <span
                  key={entityType.entity_type_id}
                  className="rounded-md border bg-muted/30 px-2 py-1 text-xs"
                >
                  {entityType.label}
                </span>
              ))}
              <Button
                size="sm"
                variant="secondary"
                disabled={applyingSuggestions}
                onClick={() => void applySuggestedEntityTypes()}
              >
                Apply suggestions
              </Button>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              No suggestions currently available for this profile context.
            </span>
          )}
        </CardContent>
      </Card>

      {activeSection === "explorer" ? (
        <DomainExplorerScreen
          contextPane={contextPaneProps}
          canvas={{
            documentType: draft.document_type,
            entityTypesByID,
            entityUsages: draft.entity_usages,
            exampleDocumentCount: boundExampleDocumentIDs.size,
            profileLabel: draft.label,
            selectedAttributeUsageID,
            selectedEntityUsageID,
            taxonomyPath,
            onSelectAttributeUsage: (entityUsageID, attributeUsageID) => {
              setSelectedEntityUsageID(entityUsageID)
              setSelectedAttributeUsageID(attributeUsageID)
              setComposerMode("contextual")
            },
            onSelectEntityUsage: (usageID) => {
              setSelectedEntityUsageID(usageID)
              setComposerMode("contextual")
            },
          }}
          inspectorPane={inspectorPaneProps}
          evidencePane={evidencePaneProps}
        />
      ) : (
        <EntityLibraryScreen
          composerPane={{
            applicabilityOptions,
            attributeValueTypeOptions,
            cardinalityOptions,
            composerMode,
            deletingEntityType,
            draftEntityUsageCount: draft.entity_usages.length,
            entityTypeDraft,
            entityTypeSearch,
            entityTypes,
            entityTypesByID,
            entityUsages: draft.entity_usages,
            filteredEntityTypes,
            initialQualifiers,
            isEntityTypeDirty,
            lockedMode: "canonical",
            pendingEntityTypeID,
            refreshingEntityTypes,
            savingEntityType,
            scopeOptions,
            selectedAttributeTypeID,
            selectedAttributeUsageID,
            selectedEntityType,
            selectedEntityTypeID,
            selectedEntityUsageID,
            sourceID,
            statusOptions,
            onAddEntityUsage: addEntityUsage,
            onComposerModeChange: setComposerMode,
            onCreateEmptyAttributeType: emptyAttributeTypeDraft,
            onCreateNewEntityType: () => {
              setSelectedEntityTypeID("__new__")
              setComposerMode("canonical")
            },
            onDeleteAttributeUsage: deleteAttributeUsage,
            onDeleteEntityType: () => void handleDeleteEntityType(),
            onDeleteEntityUsage: deleteEntityUsage,
            onEntityTypeSearchChange: setEntityTypeSearch,
            onMoveAttributeUsage: moveAttributeUsage,
            onMoveEntityUsage: moveEntityUsage,
            onPendingEntityTypeIDChange: setPendingEntityTypeID,
            onRefreshEntityTypes: () => void reloadEntityTypes(),
            onSaveEntityType: () => void handleSaveEntityType(),
            onSelectAttributeType: (attributeClientID) => {
              setSelectedAttributeTypeID(attributeClientID)
              setComposerMode("canonical")
            },
            onSelectAttributeUsage: (entityUsageID, attributeUsageID) => {
              setSelectedEntityUsageID(entityUsageID)
              setSelectedAttributeUsageID(attributeUsageID)
              setComposerMode("contextual")
            },
            onSelectEntityType: (entityTypeID) => {
              setSelectedEntityTypeID(entityTypeID)
              setComposerMode("canonical")
            },
            onSelectEntityUsage: (usageID) => {
              setSelectedEntityUsageID(usageID)
              setComposerMode("contextual")
            },
            onSetEntityTypeDraft: setEntityTypeDraft,
            onUpdateAttributeTypeDraft: updateAttributeTypeDraft,
            onUpdateAttributeUsage: updateAttributeUsage,
            onUpdateEntityUsage: updateEntityUsage,
          }}
          inspectorPane={inspectorPaneProps}
        />
      )}
    </div>
  )
}
