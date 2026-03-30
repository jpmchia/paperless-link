"use client"

import { Loader2, Plus, RefreshCcw, Save, Trash2, X } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { AttributeType, AttributeUsage, EntityType, EntityUsage, Qualifier } from "@/lib/link-iq-types"
import type {
  AttributeTypeDraft,
  ComposerMode,
  EntityTypeDraft,
  ScopeOption,
  SelectOption,
} from "./types"

type Props = {
  applicabilityOptions: SelectOption[]
  attributeValueTypeOptions: string[]
  cardinalityOptions: SelectOption[]
  composerMode: ComposerMode
  deletingEntityType: boolean
  draftEntityUsageCount: number
  entityTypeDraft: EntityTypeDraft
  entityTypeSearch: string
  entityTypes: EntityType[]
  entityTypesByID: Record<string, EntityType>
  entityUsages: EntityUsage[]
  filteredEntityTypes: EntityType[]
  initialQualifiers: Qualifier[]
  isEntityTypeDirty: boolean
  lockedMode?: ComposerMode
  pendingEntityTypeID: string
  refreshingEntityTypes: boolean
  savingEntityType: boolean
  scopeOptions: ScopeOption[]
  selectedAttributeTypeID: string
  selectedAttributeUsageID: string
  selectedEntityType: EntityType | null
  selectedEntityTypeID: string
  selectedEntityUsageID: string
  sourceID: string
  statusOptions: SelectOption[]
  onAddEntityUsage: (entityTypeID: string) => void
  onComposerModeChange: (value: ComposerMode) => void
  onCreateEmptyAttributeType: () => AttributeTypeDraft
  onCreateNewEntityType: () => void
  onDeleteEntityType: () => void
  onDeleteEntityUsage: (usageID: string) => void
  onDeleteAttributeUsage: (entityUsageID: string, attributeUsageID: string) => void
  onEntityTypeSearchChange: (value: string) => void
  onMoveAttributeUsage: (entityUsageID: string, attributeUsageID: string, direction: -1 | 1) => void
  onMoveEntityUsage: (usageID: string, direction: -1 | 1) => void
  onPendingEntityTypeIDChange: (value: string) => void
  onRefreshEntityTypes: () => void
  onSaveEntityType: () => void
  onSelectAttributeType: (attributeClientID: string) => void
  onSelectAttributeUsage: (entityUsageID: string, attributeUsageID: string) => void
  onSelectEntityType: (entityTypeID: string) => void
  onSelectEntityUsage: (usageID: string) => void
  onSetEntityTypeDraft: (updater: (current: EntityTypeDraft) => EntityTypeDraft) => void
  onUpdateAttributeTypeDraft: (
    attributeClientID: string,
    updater: (attribute: AttributeTypeDraft) => AttributeTypeDraft
  ) => void
  onUpdateAttributeUsage: (
    entityUsageID: string,
    attributeUsageID: string,
    updater: (attributeUsage: AttributeUsage) => AttributeUsage
  ) => void
  onUpdateEntityUsage: (
    usageID: string,
    updater: (entityUsage: EntityUsage) => EntityUsage
  ) => void
}

function toggleID(values: string[] | undefined, value: string, checked: boolean) {
  const current = new Set(values ?? [])
  if (checked) {
    current.add(value)
  } else {
    current.delete(value)
  }
  return [...current]
}

function qualifierOptionsForAttribute(
  qualifiers: Qualifier[],
  attributeType: AttributeType | undefined
) {
  if (!attributeType?.allowed_qualifier_ids?.length) return qualifiers
  const allowed = new Set(attributeType.allowed_qualifier_ids)
  return qualifiers.filter((qualifier) => allowed.has(qualifier.qualifier_id))
}

export function DomainModelsComposerPane({
  applicabilityOptions,
  attributeValueTypeOptions,
  cardinalityOptions,
  composerMode,
  deletingEntityType,
  draftEntityUsageCount,
  entityTypeDraft,
  entityTypeSearch,
  entityTypes,
  entityTypesByID,
  entityUsages,
  filteredEntityTypes,
  initialQualifiers,
  isEntityTypeDirty,
  lockedMode,
  onAddEntityUsage,
  onComposerModeChange,
  onCreateEmptyAttributeType,
  onCreateNewEntityType,
  onDeleteAttributeUsage,
  onDeleteEntityType,
  onDeleteEntityUsage,
  onEntityTypeSearchChange,
  onMoveAttributeUsage,
  onMoveEntityUsage,
  onPendingEntityTypeIDChange,
  onRefreshEntityTypes,
  onSaveEntityType,
  onSelectAttributeType,
  onSelectAttributeUsage,
  onSelectEntityType,
  onSelectEntityUsage,
  onSetEntityTypeDraft,
  onUpdateAttributeTypeDraft,
  onUpdateAttributeUsage,
  onUpdateEntityUsage,
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
}: Props) {
  const effectiveComposerMode = lockedMode ?? composerMode

  return (
    <Card className="min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Model Composer</div>
              <div className="text-[11px] text-muted-foreground">
                Separate reusable canonical semantics from active context-specific usage.
              </div>
            </div>
            <Badge variant="outline">{draftEntityUsageCount} active entities</Badge>
          </div>
        </div>

        <Tabs
          value={effectiveComposerMode}
          onValueChange={(value) => onComposerModeChange(value as ComposerMode)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {lockedMode ? null : (
            <div className="px-4 pt-3">
              <TabsList variant="line" className="justify-start border-b p-0">
                <TabsTrigger value="contextual">Context Model</TabsTrigger>
                <TabsTrigger value="canonical">Canonical Library</TabsTrigger>
              </TabsList>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-hidden p-4">
            <TabsContent value="contextual" className="m-0 h-full overflow-y-auto">
              <div className="grid gap-4">
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Active Entities</CardTitle>
                    <CardDescription>
                      Tailor reusable entity types for this exact context profile.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div className="flex gap-2">
                      <Select
                        value={pendingEntityTypeID || "__none__"}
                        onValueChange={(value) =>
                          onPendingEntityTypeIDChange(value === "__none__" ? "" : value)
                        }
                      >
                        <SelectTrigger id="entity-type-add" className="min-w-0 flex-1">
                          <SelectValue placeholder="Choose entity type for profile" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Choose entity type</SelectItem>
                          {entityTypes.map((entityType) => (
                            <SelectItem key={entityType.entity_type_id} value={entityType.entity_type_id}>
                              {entityType.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddEntityUsage(pendingEntityTypeID)}
                        disabled={!pendingEntityTypeID}
                      >
                        <Plus className="size-4" />
                        Use
                      </Button>
                    </div>

                    {entityUsages.length === 0 ? (
                      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        No entity usages yet. Add a canonical entity type from the library and then refine it for this context.
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {entityUsages.map((entityUsage, entityIndex) => {
                          const entityType = entityTypesByID[entityUsage.entity_type_id]
                          return (
                            <Card
                              key={entityUsage.usage_id}
                              size="sm"
                              className={cn(
                                "transition-colors",
                                selectedEntityUsageID === entityUsage.usage_id &&
                                  "border-primary ring-1 ring-primary/30"
                              )}
                            >
                              <CardHeader>
                                <div className="flex items-start justify-between gap-3">
                                  <button
                                    type="button"
                                    className="min-w-0 text-left"
                                    onClick={() => onSelectEntityUsage(entityUsage.usage_id)}
                                  >
                                    <CardTitle>
                                      {entityUsage.label || entityType?.label || "Entity Usage"}
                                    </CardTitle>
                                    <CardDescription>
                                      {entityType?.label || entityUsage.entity_type_id}
                                    </CardDescription>
                                  </button>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => onMoveEntityUsage(entityUsage.usage_id, -1)}
                                      disabled={entityIndex === 0}
                                    >
                                      ↑
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => onMoveEntityUsage(entityUsage.usage_id, 1)}
                                      disabled={entityIndex === entityUsages.length - 1}
                                    >
                                      ↓
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => onDeleteEntityUsage(entityUsage.usage_id)}
                                    >
                                      <X className="size-4" />
                                      <span className="sr-only">Remove entity usage</span>
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="grid gap-4">
                                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                                  <div className="grid gap-2">
                                    <Label>Entity Type</Label>
                                    <Select
                                      value={entityUsage.entity_type_id}
                                      onValueChange={(value) => {
                                        const nextEntityType = entityTypesByID[value]
                                        if (!nextEntityType) return
                                        onUpdateEntityUsage(entityUsage.usage_id, (current) => ({
                                          ...current,
                                          attributes: (nextEntityType.attributes ?? []).map((attributeType) => ({
                                            applicability: attributeType.required ? "required" : "allowed",
                                            attribute_type_id: attributeType.attribute_type_id,
                                            description: attributeType.description ?? "",
                                            label: attributeType.label,
                                            qualifier_ids: [],
                                            required: Boolean(attributeType.required),
                                            usage_id: current.usage_id + "-" + attributeType.attribute_type_id,
                                          })),
                                          description: current.description || nextEntityType.description || "",
                                          entity_type_id: value,
                                          label: current.label || nextEntityType.label || "",
                                        }))
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {entityTypes.map((option) => (
                                          <SelectItem key={option.entity_type_id} value={option.entity_type_id}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Label</Label>
                                    <Input
                                      value={entityUsage.label ?? ""}
                                      onChange={(event) =>
                                        onUpdateEntityUsage(entityUsage.usage_id, (current) => ({
                                          ...current,
                                          label: event.target.value,
                                        }))
                                      }
                                      placeholder={entityType?.label || "Company"}
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Cardinality</Label>
                                    <Select
                                      value={entityUsage.cardinality}
                                      onValueChange={(value) =>
                                        onUpdateEntityUsage(entityUsage.usage_id, (current) => ({
                                          ...current,
                                          cardinality: value,
                                        }))
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {cardinalityOptions.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Applicability</Label>
                                    <Select
                                      value={entityUsage.applicability || "allowed"}
                                      onValueChange={(value) =>
                                        onUpdateEntityUsage(entityUsage.usage_id, (current) => ({
                                          ...current,
                                          applicability: value,
                                        }))
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {applicabilityOptions.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(entityUsage.required)}
                                    onChange={(event) =>
                                      onUpdateEntityUsage(entityUsage.usage_id, (current) => ({
                                        ...current,
                                        required: event.target.checked,
                                      }))
                                    }
                                  />
                                  Required entity usage
                                </label>

                                <div className="grid gap-2">
                                  <Label>Description</Label>
                                  <Textarea
                                    value={entityUsage.description ?? ""}
                                    onChange={(event) =>
                                      onUpdateEntityUsage(entityUsage.usage_id, (current) => ({
                                        ...current,
                                        description: event.target.value,
                                      }))
                                    }
                                    placeholder="Describe how this entity appears in the selected context."
                                  />
                                </div>

                                {initialQualifiers.length > 0 ? (
                                  <div className="grid gap-2">
                                    <div className="text-xs font-medium text-muted-foreground">
                                      Entity Qualifiers
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                      {initialQualifiers.map((qualifier) => (
                                        <label
                                          key={qualifier.qualifier_id}
                                          className="flex items-center gap-2 text-xs text-muted-foreground"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={Boolean(
                                              entityUsage.qualifier_ids?.includes(qualifier.qualifier_id)
                                            )}
                                            onChange={(event) =>
                                              onUpdateEntityUsage(entityUsage.usage_id, (current) => ({
                                                ...current,
                                                qualifier_ids: toggleID(
                                                  current.qualifier_ids,
                                                  qualifier.qualifier_id,
                                                  event.target.checked
                                                ),
                                              }))
                                            }
                                          />
                                          {qualifier.label}
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                <div className="grid gap-3">
                                  <div className="text-sm font-medium">Attributes</div>
                                  {(entityUsage.attributes ?? []).length === 0 ? (
                                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                                      The selected entity type has no attributes yet.
                                    </div>
                                  ) : (
                                    (entityUsage.attributes ?? []).map((attributeUsage, attributeIndex) => {
                                      const attributeType = entityType?.attributes?.find(
                                        (candidate) =>
                                          candidate.attribute_type_id === attributeUsage.attribute_type_id
                                      )
                                      const qualifierOptions = qualifierOptionsForAttribute(
                                        initialQualifiers,
                                        attributeType
                                      )
                                      const isSelected = selectedAttributeUsageID === attributeUsage.usage_id

                                      return (
                                        <div
                                          key={attributeUsage.usage_id}
                                          className={cn(
                                            "rounded-md border bg-background p-3 transition-colors",
                                            isSelected && "border-primary ring-1 ring-primary/30"
                                          )}
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <button
                                              type="button"
                                              className="min-w-0 text-left"
                                              onClick={() =>
                                                onSelectAttributeUsage(
                                                  entityUsage.usage_id,
                                                  attributeUsage.usage_id
                                                )
                                              }
                                            >
                                              <div className="text-sm font-medium">
                                                {attributeUsage.label || attributeType?.label || "Attribute Usage"}
                                              </div>
                                              <div className="text-xs text-muted-foreground">
                                                {attributeType?.name || attributeUsage.attribute_type_id}
                                              </div>
                                            </button>
                                            <div className="flex items-center gap-2">
                                              <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() =>
                                                  onMoveAttributeUsage(
                                                    entityUsage.usage_id,
                                                    attributeUsage.usage_id,
                                                    -1
                                                  )
                                                }
                                                disabled={attributeIndex === 0}
                                              >
                                                ↑
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() =>
                                                  onMoveAttributeUsage(
                                                    entityUsage.usage_id,
                                                    attributeUsage.usage_id,
                                                    1
                                                  )
                                                }
                                                disabled={attributeIndex === (entityUsage.attributes?.length ?? 0) - 1}
                                              >
                                                ↓
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() =>
                                                  onDeleteAttributeUsage(
                                                    entityUsage.usage_id,
                                                    attributeUsage.usage_id
                                                  )
                                                }
                                              >
                                                <X className="size-4" />
                                                <span className="sr-only">Remove attribute usage</span>
                                              </Button>
                                            </div>
                                          </div>

                                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                                            <div className="grid gap-2">
                                              <Label>Attribute</Label>
                                              <Select
                                                value={attributeUsage.attribute_type_id}
                                                onValueChange={(value) => {
                                                  const nextAttributeType = entityType?.attributes?.find(
                                                    (candidate) => candidate.attribute_type_id === value
                                                  )
                                                  if (!nextAttributeType) return
                                                  onUpdateAttributeUsage(
                                                    entityUsage.usage_id,
                                                    attributeUsage.usage_id,
                                                    (current) => ({
                                                      ...current,
                                                      applicability:
                                                        current.applicability ||
                                                        (nextAttributeType.required ? "required" : "allowed"),
                                                      attribute_type_id: value,
                                                      description:
                                                        current.description || nextAttributeType.description || "",
                                                      label: current.label || nextAttributeType.label || "",
                                                      required:
                                                        current.required || Boolean(nextAttributeType.required),
                                                    })
                                                  )
                                                }}
                                              >
                                                <SelectTrigger>
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {(entityType?.attributes ?? []).map((attributeOption) => (
                                                    <SelectItem
                                                      key={attributeOption.attribute_type_id}
                                                      value={attributeOption.attribute_type_id}
                                                    >
                                                      {attributeOption.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="grid gap-2">
                                              <Label>Label</Label>
                                              <Input
                                                value={attributeUsage.label ?? ""}
                                                onChange={(event) =>
                                                  onUpdateAttributeUsage(
                                                    entityUsage.usage_id,
                                                    attributeUsage.usage_id,
                                                    (current) => ({
                                                      ...current,
                                                      label: event.target.value,
                                                    })
                                                  )
                                                }
                                                placeholder={attributeType?.label || "Label"}
                                              />
                                            </div>
                                            <div className="grid gap-2">
                                              <Label>Applicability</Label>
                                              <Select
                                                value={attributeUsage.applicability || "allowed"}
                                                onValueChange={(value) =>
                                                  onUpdateAttributeUsage(
                                                    entityUsage.usage_id,
                                                    attributeUsage.usage_id,
                                                    (current) => ({
                                                      ...current,
                                                      applicability: value,
                                                    })
                                                  )
                                                }
                                              >
                                                <SelectTrigger>
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {applicabilityOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                      {option.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </div>

                                          <div className="mt-3 grid gap-2">
                                            <Label>Description</Label>
                                            <Textarea
                                              value={attributeUsage.description ?? ""}
                                              onChange={(event) =>
                                                onUpdateAttributeUsage(
                                                  entityUsage.usage_id,
                                                  attributeUsage.usage_id,
                                                  (current) => ({
                                                    ...current,
                                                    description: event.target.value,
                                                  })
                                                )
                                              }
                                              placeholder="Capture how this attribute manifests in the selected context."
                                            />
                                          </div>

                                          <div className="mt-3 flex flex-wrap items-center gap-3">
                                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                              <input
                                                type="checkbox"
                                                checked={Boolean(attributeUsage.required)}
                                                onChange={(event) =>
                                                  onUpdateAttributeUsage(
                                                    entityUsage.usage_id,
                                                    attributeUsage.usage_id,
                                                    (current) => ({
                                                      ...current,
                                                      required: event.target.checked,
                                                    })
                                                  )
                                                }
                                              />
                                              Required attribute usage
                                            </label>
                                            {attributeType ? (
                                              <Badge variant="outline">{attributeType.value_type}</Badge>
                                            ) : null}
                                          </div>

                                          {qualifierOptions.length > 0 ? (
                                            <div className="mt-3 grid gap-2">
                                              <div className="text-xs font-medium text-muted-foreground">
                                                Attribute Qualifiers
                                              </div>
                                              <div className="flex flex-wrap gap-3">
                                                {qualifierOptions.map((qualifier) => (
                                                  <label
                                                    key={qualifier.qualifier_id}
                                                    className="flex items-center gap-2 text-xs text-muted-foreground"
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      checked={Boolean(
                                                        attributeUsage.qualifier_ids?.includes(
                                                          qualifier.qualifier_id
                                                        )
                                                      )}
                                                      onChange={(event) =>
                                                        onUpdateAttributeUsage(
                                                          entityUsage.usage_id,
                                                          attributeUsage.usage_id,
                                                          (current) => ({
                                                            ...current,
                                                            qualifier_ids: toggleID(
                                                              current.qualifier_ids,
                                                              qualifier.qualifier_id,
                                                              event.target.checked
                                                            ),
                                                          })
                                                        )
                                                      }
                                                    />
                                                    {qualifier.label}
                                                  </label>
                                                ))}
                                              </div>
                                            </div>
                                          ) : null}
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="canonical" className="m-0 h-full overflow-y-auto">
              <Card size="sm" className="min-h-0">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>Entity Library</CardTitle>
                      <CardDescription>
                        Define canonical entity types and their base attributes inside the workspace.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefreshEntityTypes}
                        disabled={refreshingEntityTypes}
                      >
                        {refreshingEntityTypes ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <RefreshCcw className="size-4" />
                        )}
                        Refresh
                      </Button>
                      <Button size="sm" onClick={onCreateNewEntityType}>
                        <Plus className="size-4" />
                        New
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <Input
                    placeholder="Search entity types and attributes"
                    value={entityTypeSearch}
                    onChange={(event) => onEntityTypeSearchChange(event.target.value)}
                  />

                  <div className="max-h-56 overflow-y-auto rounded-md border">
                    {filteredEntityTypes.length === 0 ? (
                      <div className="flex min-h-24 items-center justify-center p-4 text-center text-xs text-muted-foreground">
                        No entity types match the current search.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredEntityTypes.map((entityType) => {
                          const isActive = entityType.entity_type_id === selectedEntityTypeID
                          return (
                            <button
                              key={entityType.entity_type_id}
                              type="button"
                              className={cn(
                                "flex w-full flex-col gap-1 px-3 py-2 text-left transition-colors hover:bg-muted/50",
                                isActive && "bg-muted"
                              )}
                              onClick={() => onSelectEntityType(entityType.entity_type_id)}
                            >
                              <div className="truncate text-sm font-medium">{entityType.label}</div>
                              <div className="truncate text-[11px] text-muted-foreground">
                                {entityType.attributes?.length ?? 0} attributes
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">
                          {selectedEntityType ? "Edit Entity Type" : "New Entity Type"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Base entity definitions and attributes reused by context profiles.
                        </div>
                      </div>
                      {selectedEntityType ? (
                        <Badge variant="outline">{selectedEntityType.entity_type_id}</Badge>
                      ) : null}
                    </div>

                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label>Label</Label>
                        <Input
                          value={entityTypeDraft.label}
                          onChange={(event) =>
                            onSetEntityTypeDraft((current) => ({
                              ...current,
                              label: event.target.value,
                            }))
                          }
                          placeholder="Company"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Description</Label>
                        <Textarea
                          value={entityTypeDraft.description}
                          onChange={(event) =>
                            onSetEntityTypeDraft((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          placeholder="Canonical party or organization entity."
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label>Status</Label>
                          <Select
                            value={entityTypeDraft.status}
                            onValueChange={(value) =>
                              onSetEntityTypeDraft((current) => ({
                                ...current,
                                status: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Source Scope</Label>
                          <Select
                            value={entityTypeDraft.source_scope}
                            onValueChange={(value) =>
                              onSetEntityTypeDraft((current) => ({
                                ...current,
                                source_id:
                                  value === "link_global" ? "" : current.source_id || sourceID,
                                source_scope: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {scopeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Source ID</Label>
                        <Input
                          value={entityTypeDraft.source_scope === "link_global" ? "" : entityTypeDraft.source_id}
                          disabled={entityTypeDraft.source_scope === "link_global"}
                          onChange={(event) =>
                            onSetEntityTypeDraft((current) => ({
                              ...current,
                              source_id: event.target.value,
                            }))
                          }
                          placeholder={sourceID}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">Base Attributes</div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onSetEntityTypeDraft((current) => ({
                              ...current,
                              attributes: [...current.attributes, onCreateEmptyAttributeType()],
                            }))
                          }
                        >
                          <Plus className="size-4" />
                          Add Attribute
                        </Button>
                      </div>

                      {entityTypeDraft.attributes.length === 0 ? (
                        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                          No base attributes yet.
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {entityTypeDraft.attributes.map((attribute) => (
                            <div
                              key={attribute._client_id}
                              className={cn(
                                "rounded-md border bg-background p-3 transition-colors",
                                selectedAttributeTypeID === attribute._client_id &&
                                  "border-primary ring-1 ring-primary/30"
                              )}
                              onClick={() => onSelectAttributeType(attribute._client_id)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-sm font-medium">
                                  {attribute.label || attribute.name || "New Attribute"}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    onSetEntityTypeDraft((current) => ({
                                      ...current,
                                      attributes: current.attributes.filter(
                                        (candidate) => candidate._client_id !== attribute._client_id
                                      ),
                                    }))
                                  }}
                                >
                                  <X className="size-4" />
                                  <span className="sr-only">Remove attribute</span>
                                </Button>
                              </div>

                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <div className="grid gap-2">
                                  <Label htmlFor={"entity-attribute-name-" + attribute._client_id}>Name</Label>
                                  <Input
                                    id={"entity-attribute-name-" + attribute._client_id}
                                    value={attribute.name}
                                    onChange={(event) =>
                                      onUpdateAttributeTypeDraft(attribute._client_id, (current) => ({
                                        ...current,
                                        name: event.target.value,
                                      }))
                                    }
                                    placeholder="trading_name"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor={"entity-attribute-label-" + attribute._client_id}>Label</Label>
                                  <Input
                                    id={"entity-attribute-label-" + attribute._client_id}
                                    value={attribute.label}
                                    onChange={(event) =>
                                      onUpdateAttributeTypeDraft(attribute._client_id, (current) => ({
                                        ...current,
                                        label: event.target.value,
                                      }))
                                    }
                                    placeholder="Trading Name"
                                  />
                                </div>
                              </div>

                              <div className="mt-3 grid gap-3 md:grid-cols-3">
                                <div className="grid gap-2">
                                  <Label>Value Type</Label>
                                  <Select
                                    value={attribute.value_type}
                                    onValueChange={(value) =>
                                      onUpdateAttributeTypeDraft(attribute._client_id, (current) => ({
                                        ...current,
                                        value_type: value,
                                      }))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {attributeValueTypeOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-2">
                                  <Label>Cardinality</Label>
                                  <Select
                                    value={attribute.cardinality}
                                    onValueChange={(value) =>
                                      onUpdateAttributeTypeDraft(attribute._client_id, (current) => ({
                                        ...current,
                                        cardinality: value,
                                      }))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {cardinalityOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-2">
                                  <Label>Target Entity</Label>
                                  <Select
                                    value={attribute.target_entity_type_id || "__none__"}
                                    onValueChange={(value) =>
                                      onUpdateAttributeTypeDraft(attribute._client_id, (current) => ({
                                        ...current,
                                        target_entity_type_id: value === "__none__" ? "" : value,
                                      }))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">None</SelectItem>
                                      {entityTypes.map((option) => (
                                        <SelectItem key={option.entity_type_id} value={option.entity_type_id}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="mt-3 grid gap-2">
                                <Label>Description</Label>
                                <Textarea
                                  value={attribute.description}
                                  onChange={(event) =>
                                    onUpdateAttributeTypeDraft(attribute._client_id, (current) => ({
                                      ...current,
                                      description: event.target.value,
                                    }))
                                  }
                                  placeholder="Canonical attribute semantics."
                                />
                              </div>

                              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                <input
                                  type="checkbox"
                                  checked={attribute.required}
                                  onChange={(event) =>
                                    onUpdateAttributeTypeDraft(attribute._client_id, (current) => ({
                                      ...current,
                                      required: event.target.checked,
                                    }))
                                  }
                                />
                                Required by default
                              </div>

                              {initialQualifiers.length > 0 ? (
                                <div className="mt-3 grid gap-2">
                                  <div className="text-xs font-medium text-muted-foreground">
                                    Allowed Qualifiers
                                  </div>
                                  <div className="flex flex-wrap gap-3">
                                    {initialQualifiers.map((qualifier) => (
                                      <label
                                        key={qualifier.qualifier_id}
                                        className="flex items-center gap-2 text-xs text-muted-foreground"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={attribute.allowed_qualifier_ids.includes(qualifier.qualifier_id)}
                                          onChange={(event) =>
                                            onUpdateAttributeTypeDraft(attribute._client_id, (current) => ({
                                              ...current,
                                              allowed_qualifier_ids: toggleID(
                                                current.allowed_qualifier_ids,
                                                qualifier.qualifier_id,
                                                event.target.checked
                                              ),
                                            }))
                                          }
                                        />
                                        {qualifier.label}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {selectedEntityType ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={onDeleteEntityType}
                          disabled={deletingEntityType || savingEntityType}
                        >
                          {deletingEntityType ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                          Delete
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        onClick={onSaveEntityType}
                        disabled={savingEntityType || !entityTypeDraft.label.trim() || !isEntityTypeDirty}
                      >
                        {savingEntityType ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        Save Entity
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Card>
  )
}
