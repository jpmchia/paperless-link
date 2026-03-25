"use client"

import * as React from "react"
import {
  AlertCircle,
  FileCode2,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { deleteJson, getJson, postJson } from "@/lib/paperless-client"

type TaxonomyNode = {
  path: string
  source_id?: string
  source_scope?: string
  taxonomy_node_id: string
}

type DocumentTypeOption = {
  id: number
  name: string
}

type AttributeDefinition = {
  attribute_id: string
  description?: string
  label: string
  name: string
  required?: boolean
  value_type: string
}

type EntityDefinition = {
  attributes?: AttributeDefinition[]
  cardinality: string
  description?: string
  entity_type: string
  label: string
  required?: boolean
}

type DomainModelDefinition = {
  definition_id: string
  description?: string
  document_type?: string
  entities?: EntityDefinition[]
  label: string
  source_id?: string
  source_scope: string
  status: string
  taxonomy_node_id?: string
  taxonomy_path?: string
  version: number
}

type DefinitionDraft = {
  definition_id: string
  description: string
  document_type: string
  entities: EntityDefinition[]
  label: string
  source_id: string
  source_scope: string
  status: string
  taxonomy_node_id: string
}

type Props = {
  initialDefinitions: DomainModelDefinition[]
  initialTaxonomyNodes: TaxonomyNode[]
  initialDocumentTypes: DocumentTypeOption[]
  sourceID: string
}

const scopeOptions = [
  { label: "Link Global", value: "link_global" },
  { label: "Source Specific", value: "source_specific" },
  { label: "Source Aligned", value: "source_aligned" },
]

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
]

const cardinalityOptions = [
  { label: "One", value: "one" },
  { label: "Many", value: "many" },
]

const valueTypeOptions = [
  "string",
  "number",
  "date",
  "boolean",
  "currency",
  "reference",
  "email",
  "url",
]

function sortDefinitions(definitions: DomainModelDefinition[]) {
  return [...definitions].sort((left, right) => {
    const leftKey = `${left.taxonomy_path || ""} ${left.document_type || ""} ${left.label}`
    const rightKey = `${right.taxonomy_path || ""} ${right.document_type || ""} ${right.label}`
    return leftKey.localeCompare(rightKey)
  })
}

function cloneEntities(entities: EntityDefinition[] | undefined) {
  return (entities ?? []).map((entity) => ({
    ...entity,
    attributes: (entity.attributes ?? []).map((attribute) => ({ ...attribute })),
  }))
}

function buildDraft(
  definition: DomainModelDefinition | null,
  sourceID: string
): DefinitionDraft {
  if (!definition) {
    return {
      definition_id: "",
      description: "",
      document_type: "",
      entities: [],
      label: "",
      source_id: "",
      source_scope: "link_global",
      status: "active",
      taxonomy_node_id: "",
    }
  }

  return {
    definition_id: definition.definition_id,
    description: definition.description ?? "",
    document_type: definition.document_type ?? "",
    entities: cloneEntities(definition.entities),
    label: definition.label,
    source_id:
      definition.source_scope === "link_global"
        ? ""
        : definition.source_id || sourceID,
    source_scope: definition.source_scope || "link_global",
    status: definition.status || "active",
    taxonomy_node_id: definition.taxonomy_node_id ?? "",
  }
}

function serializeDefinitionDraft(draft: DefinitionDraft) {
  return JSON.stringify({
    ...draft,
    description: draft.description.trim(),
    document_type: draft.document_type.trim(),
    entities: cloneEntities(draft.entities),
    label: draft.label.trim(),
    source_id: draft.source_scope === "link_global" ? "" : draft.source_id.trim(),
    taxonomy_node_id: draft.taxonomy_node_id.trim(),
  })
}

function emptyEntity(): EntityDefinition {
  return {
    attributes: [],
    cardinality: "one",
    description: "",
    entity_type: "",
    label: "",
    required: false,
  }
}

function emptyAttribute(): AttributeDefinition {
  return {
    attribute_id: "",
    description: "",
    label: "",
    name: "",
    required: false,
    value_type: "string",
  }
}

export function DomainModelsWorkbench({
  initialDefinitions,
  initialTaxonomyNodes,
  initialDocumentTypes,
  sourceID,
}: Props) {
  const [definitions, setDefinitions] = React.useState(() =>
    sortDefinitions(initialDefinitions)
  )
  const [selectedDefinitionID, setSelectedDefinitionID] = React.useState(
    initialDefinitions[0]?.definition_id ?? "__new__"
  )
  const [draft, setDraft] = React.useState<DefinitionDraft>(() =>
    buildDraft(initialDefinitions[0] ?? null, sourceID)
  )
  const [search, setSearch] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)

  const selectedDefinition = React.useMemo(
    () =>
      definitions.find((definition) => definition.definition_id === selectedDefinitionID) ??
      null,
    [definitions, selectedDefinitionID]
  )

  React.useEffect(() => {
    setDraft(buildDraft(selectedDefinition, sourceID))
  }, [selectedDefinition, sourceID])

  const taxonomyPath = React.useMemo(() => {
    return (
      initialTaxonomyNodes.find(
        (node) => node.taxonomy_node_id === draft.taxonomy_node_id
      )?.path ?? ""
    )
  }, [draft.taxonomy_node_id, initialTaxonomyNodes])

  const filteredDefinitions = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return definitions

    return definitions.filter((definition) => {
      const searchable = [
        definition.label,
        definition.taxonomy_path,
        definition.document_type,
        ...(definition.entities ?? []).map((entity) => entity.entity_type),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return searchable.includes(query)
    })
  }, [definitions, search])

  const totalEntityCount = React.useMemo(
    () => definitions.reduce((count, definition) => count + (definition.entities?.length ?? 0), 0),
    [definitions]
  )
  const totalAttributeCount = React.useMemo(
    () =>
      definitions.reduce((count, definition) => {
        return (
          count +
          (definition.entities ?? []).reduce((entityCount, entity) => {
            return entityCount + (entity.attributes?.length ?? 0)
          }, 0)
        )
      }, 0),
    [definitions]
  )

  const isDirty = React.useMemo(() => {
    return (
      serializeDefinitionDraft(draft) !==
      serializeDefinitionDraft(buildDraft(selectedDefinition, sourceID))
    )
  }, [draft, selectedDefinition, sourceID])

  async function reloadDefinitions(nextDefinitionID?: string) {
    setRefreshing(true)
    try {
      const response = await getJson<{ definitions?: DomainModelDefinition[] }>(
        "/api/link-iq/domain-models"
      )
      const nextDefinitions = sortDefinitions(response.definitions ?? [])
      setDefinitions(nextDefinitions)

      const fallbackDefinitionID = nextDefinitions[0]?.definition_id ?? "__new__"
      const resolvedDefinitionID =
        nextDefinitionID &&
        nextDefinitions.some(
          (definition) => definition.definition_id === nextDefinitionID
        )
          ? nextDefinitionID
          : selectedDefinitionID !== "__new__" &&
              nextDefinitions.some(
                (definition) => definition.definition_id === selectedDefinitionID
              )
            ? selectedDefinitionID
            : fallbackDefinitionID

      setSelectedDefinitionID(resolvedDefinitionID)
    } catch (error) {
      toast.error("Failed to reload domain models", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setRefreshing(false)
    }
  }

  function updateEntity(
    entityIndex: number,
    updater: (entity: EntityDefinition) => EntityDefinition
  ) {
    setDraft((current) => ({
      ...current,
      entities: current.entities.map((entity, index) =>
        index === entityIndex ? updater(entity) : entity
      ),
    }))
  }

  function updateAttribute(
    entityIndex: number,
    attributeIndex: number,
    updater: (attribute: AttributeDefinition) => AttributeDefinition
  ) {
    updateEntity(entityIndex, (entity) => ({
      ...entity,
      attributes: (entity.attributes ?? []).map((attribute, index) =>
        index === attributeIndex ? updater(attribute) : attribute
      ),
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const definition = await postJson<DomainModelDefinition>(
        "/api/link-iq/domain-models",
        {
          definition_id: draft.definition_id || undefined,
          description: draft.description.trim() || undefined,
          document_type: draft.document_type.trim() || undefined,
          entities: draft.entities.map((entity) => ({
            ...entity,
            attributes: (entity.attributes ?? []).map((attribute) => ({
              ...attribute,
              attribute_id: attribute.attribute_id.trim() || undefined,
              description: attribute.description?.trim() || undefined,
              label: attribute.label.trim(),
              name: attribute.name.trim(),
            })),
            description: entity.description?.trim() || undefined,
            entity_type: entity.entity_type.trim(),
            label: entity.label.trim(),
          })),
          label: draft.label.trim(),
          source_id:
            draft.source_scope === "link_global"
              ? undefined
              : draft.source_id.trim() || sourceID,
          source_scope: draft.source_scope,
          status: draft.status,
          taxonomy_node_id: draft.taxonomy_node_id.trim() || undefined,
        }
      )

      toast.success(
        draft.definition_id ? "Domain model updated" : "Domain model created"
      )
      await reloadDefinitions(definition.definition_id)
    } catch (error) {
      toast.error("Failed to save domain model", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedDefinition) return
    setDeleting(true)
    try {
      await deleteJson(`/api/link-iq/domain-models/${selectedDefinition.definition_id}`)
      toast.success("Domain model deleted")
      await reloadDefinitions("__new__")
    } catch (error) {
      toast.error("Failed to delete domain model", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Definitions</CardTitle>
            <CardDescription>Saved model contexts for Link extraction.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {definitions.length}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Entities</CardTitle>
            <CardDescription>Total entity definitions across all models.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalEntityCount}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Attributes</CardTitle>
            <CardDescription>Structured fields available for review and approval.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalAttributeCount}
          </CardContent>
        </Card>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)]">
        <Card className="min-h-0">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Domain Models</CardTitle>
                <CardDescription>
                  Choose a taxonomy and document-type context, then define entities and
                  attributes.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void reloadDefinitions()}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="size-4" />
                  )}
                  Refresh
                </Button>
                <Button size="sm" onClick={() => setSelectedDefinitionID("__new__")}>
                  <Plus className="size-4" />
                  New Model
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
            <Input
              placeholder="Search label, taxonomy path, document type, entity"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
              {filteredDefinitions.length === 0 ? (
                <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                  <AlertCircle className="size-4" />
                  <p>No domain model definitions match the current search.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredDefinitions.map((definition) => {
                    const isActive = definition.definition_id === selectedDefinitionID
                    return (
                      <button
                        key={definition.definition_id}
                        type="button"
                        className={cn(
                          "flex w-full flex-col gap-2 px-3 py-3 text-left transition-colors hover:bg-muted/50",
                          isActive && "bg-muted"
                        )}
                        onClick={() => setSelectedDefinitionID(definition.definition_id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{definition.label}</div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {definition.taxonomy_path || "No taxonomy constraint"}
                            </div>
                          </div>
                          <Badge variant="outline">v{definition.version}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{definition.document_type || "Any document type"}</span>
                          <span>•</span>
                          <span>{definition.entities?.length ?? 0} entities</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-0">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>
                  {selectedDefinition ? "Edit Domain Model" : "Compose Domain Model"}
                </CardTitle>
                <CardDescription>
                  Capture the extraction shape for a taxonomy branch and optional
                  Paperless document type.
                </CardDescription>
              </div>
              {selectedDefinition ? (
                <Badge variant="outline">{selectedDefinition.definition_id}</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="domain-model-label">Label</Label>
                <Input
                  id="domain-model-label"
                  value={draft.label}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder="Invoice / Utilities"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="domain-model-document-type">Document Type</Label>
                <select
                  id="domain-model-document-type"
                  className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs"
                  value={draft.document_type}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      document_type: event.target.value,
                    }))
                  }
                >
                  <option value="">Any document type</option>
                  {initialDocumentTypes.map((documentType) => (
                    <option key={documentType.id} value={documentType.name}>
                      {documentType.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem_14rem]">
              <div className="grid gap-2">
                <Label htmlFor="domain-model-taxonomy">Taxonomy Node</Label>
                <select
                  id="domain-model-taxonomy"
                  className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs"
                  value={draft.taxonomy_node_id}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      taxonomy_node_id: event.target.value,
                    }))
                  }
                >
                  <option value="">No taxonomy constraint</option>
                  {initialTaxonomyNodes.map((node) => (
                    <option key={node.taxonomy_node_id} value={node.taxonomy_node_id}>
                      {node.path}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="domain-model-status">Status</Label>
                <select
                  id="domain-model-status"
                  className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs"
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="domain-model-scope">Source Scope</Label>
                <select
                  id="domain-model-scope"
                  className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs"
                  value={draft.source_scope}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      source_id:
                        event.target.value === "link_global"
                          ? ""
                          : current.source_id || sourceID,
                      source_scope: event.target.value,
                    }))
                  }
                >
                  {scopeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
              <div className="grid gap-2">
                <Label htmlFor="domain-model-description">Description</Label>
                <Textarea
                  id="domain-model-description"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="What does this model capture, and how should reviewers interpret it?"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="domain-model-source-id">Source ID</Label>
                <Input
                  id="domain-model-source-id"
                  value={draft.source_scope === "link_global" ? "" : draft.source_id}
                  disabled={draft.source_scope === "link_global"}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      source_id: event.target.value,
                    }))
                  }
                  placeholder={sourceID}
                />
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileCode2 className="size-4" />
                Context Preview
              </div>
              <div className="mt-2 text-sm">
                {taxonomyPath || "Any taxonomy branch"}
                {" • "}
                {draft.document_type || "Any Paperless document type"}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                The selected context governs which extraction definitions will match a
                document.
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">Entities</div>
                  <div className="text-[11px] text-muted-foreground">
                    Add one or more semantic entities and the attributes reviewers will
                    approve.
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      entities: [...current.entities, emptyEntity()],
                    }))
                  }
                >
                  <Plus className="size-4" />
                  Add Entity
                </Button>
              </div>

              {draft.entities.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No entities yet. Start with the primary business object you want Link
                  to extract.
                </div>
              ) : (
                <div className="grid gap-3">
                  {draft.entities.map((entity, entityIndex) => (
                    <Card key={`${entity.entity_type}-${entityIndex}`} size="sm">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle>
                              {entity.label.trim() || entity.entity_type.trim() || "New Entity"}
                            </CardTitle>
                            <CardDescription>
                              Entity {entityIndex + 1} in this domain model definition.
                            </CardDescription>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              setDraft((current) => ({
                                ...current,
                                entities: current.entities.filter(
                                  (_currentEntity, index) => index !== entityIndex
                                ),
                              }))
                            }
                          >
                            <X className="size-4" />
                            <span className="sr-only">Remove entity</span>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-3">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="grid gap-2">
                            <Label>Entity Type</Label>
                            <Input
                              value={entity.entity_type}
                              onChange={(event) =>
                                updateEntity(entityIndex, (current) => ({
                                  ...current,
                                  entity_type: event.target.value,
                                }))
                              }
                              placeholder="invoice"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Label</Label>
                            <Input
                              value={entity.label}
                              onChange={(event) =>
                                updateEntity(entityIndex, (current) => ({
                                  ...current,
                                  label: event.target.value,
                                }))
                              }
                              placeholder="Invoice"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Cardinality</Label>
                            <select
                              className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs"
                              value={entity.cardinality}
                              onChange={(event) =>
                                updateEntity(entityIndex, (current) => ({
                                  ...current,
                                  cardinality: event.target.value,
                                }))
                              }
                            >
                              {cardinalityOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={Boolean(entity.required)}
                              onChange={(event) =>
                                updateEntity(entityIndex, (current) => ({
                                  ...current,
                                  required: event.target.checked,
                                }))
                              }
                            />
                            Required entity
                          </label>
                        </div>

                        <div className="grid gap-2">
                          <Label>Description</Label>
                          <Textarea
                            value={entity.description ?? ""}
                            onChange={(event) =>
                              updateEntity(entityIndex, (current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            placeholder="Describe what this entity represents in the source document."
                          />
                        </div>

                        <div className="grid gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">Attributes</div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateEntity(entityIndex, (current) => ({
                                  ...current,
                                  attributes: [
                                    ...(current.attributes ?? []),
                                    emptyAttribute(),
                                  ],
                                }))
                              }
                            >
                              <Plus className="size-4" />
                              Add Attribute
                            </Button>
                          </div>

                          {(entity.attributes ?? []).length === 0 ? (
                            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                              No attributes for this entity yet.
                            </div>
                          ) : (
                            <div className="grid gap-3">
                              {(entity.attributes ?? []).map((attribute, attributeIndex) => (
                                <div
                                  key={`${attribute.name}-${attributeIndex}`}
                                  className="rounded-md border bg-background p-3"
                                >
                                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                                    <div className="grid gap-2">
                                      <Label>Name</Label>
                                      <Input
                                        value={attribute.name}
                                        onChange={(event) =>
                                          updateAttribute(
                                            entityIndex,
                                            attributeIndex,
                                            (current) => ({
                                              ...current,
                                              name: event.target.value,
                                            })
                                          )
                                        }
                                        placeholder="invoice_number"
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Label</Label>
                                      <Input
                                        value={attribute.label}
                                        onChange={(event) =>
                                          updateAttribute(
                                            entityIndex,
                                            attributeIndex,
                                            (current) => ({
                                              ...current,
                                              label: event.target.value,
                                            })
                                          )
                                        }
                                        placeholder="Invoice Number"
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Value Type</Label>
                                      <select
                                        className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs"
                                        value={attribute.value_type}
                                        onChange={(event) =>
                                          updateAttribute(
                                            entityIndex,
                                            attributeIndex,
                                            (current) => ({
                                              ...current,
                                              value_type: event.target.value,
                                            })
                                          )
                                        }
                                      >
                                        {valueTypeOptions.map((valueType) => (
                                          <option key={valueType} value={valueType}>
                                            {valueType}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Attribute ID</Label>
                                      <Input
                                        value={attribute.attribute_id}
                                        onChange={(event) =>
                                          updateAttribute(
                                            entityIndex,
                                            attributeIndex,
                                            (current) => ({
                                              ...current,
                                              attribute_id: event.target.value,
                                            })
                                          )
                                        }
                                        placeholder="Optional"
                                      />
                                    </div>
                                    <div className="flex items-end justify-between gap-2">
                                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(attribute.required)}
                                          onChange={(event) =>
                                            updateAttribute(
                                              entityIndex,
                                              attributeIndex,
                                              (current) => ({
                                                ...current,
                                                required: event.target.checked,
                                              })
                                            )
                                          }
                                        />
                                        Required
                                      </label>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() =>
                                          updateEntity(entityIndex, (current) => ({
                                            ...current,
                                            attributes: (current.attributes ?? []).filter(
                                              (_currentAttribute, index) =>
                                                index !== attributeIndex
                                            ),
                                          }))
                                        }
                                      >
                                        <Trash2 className="size-4" />
                                        <span className="sr-only">Remove attribute</span>
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="mt-3 grid gap-2">
                                    <Label>Description</Label>
                                    <Textarea
                                      value={attribute.description ?? ""}
                                      onChange={(event) =>
                                        updateAttribute(
                                          entityIndex,
                                          attributeIndex,
                                          (current) => ({
                                            ...current,
                                            description: event.target.value,
                                          })
                                        )
                                      }
                                      placeholder="Explain how reviewers should interpret this value."
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-muted-foreground">
                A domain model must be constrained by at least one taxonomy node or one
                Paperless document type.
              </div>
              <div className="flex items-center gap-2">
                {selectedDefinition ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleDelete()}
                    disabled={saving || deleting}
                  >
                    {deleting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Delete
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={
                    saving ||
                    !draft.label.trim() ||
                    (!draft.document_type.trim() && !draft.taxonomy_node_id.trim()) ||
                    !isDirty
                  }
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save Model
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
