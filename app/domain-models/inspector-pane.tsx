"use client"

import { Loader2, Save, Trash2 } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import type { ContextProfile, EntityType, EntityUsage, Qualifier, TaxonomyNode } from "@/lib/link-iq-types"
import type {
  AttributeTypeDraft,
  AttributeUsageSelection,
  DocumentTypeOption,
  EntityTypeDraft,
  InspectorTarget,
  ProfileDraft,
  ScopeOption,
  SelectOption,
} from "./types"

type Props = {
  boundExampleDocumentIDs: Set<string>
  deleting: boolean
  draft: ProfileDraft
  entityTypeDraft: EntityTypeDraft
  filteredTaxonomyNodes: TaxonomyNode[]
  initialDocumentTypes: DocumentTypeOption[]
  inspectorTarget: InspectorTarget
  isDirty: boolean
  qualifiersByID: Record<string, Qualifier>
  saving: boolean
  scopeOptions: ScopeOption[]
  selectedAttributeType: AttributeTypeDraft | null
  selectedAttributeUsage: AttributeUsageSelection
  selectedEntityType: EntityType | null
  selectedEntityUsage: EntityUsage | null
  selectedProfile: ContextProfile | null
  sourceID: string
  statusOptions: SelectOption[]
  taxonomyPath: string
  onDelete: () => void
  onSave: () => void
  onSetDraft: (updater: (current: ProfileDraft) => ProfileDraft) => void
}

function renderQualifierBadges(
  qualifierIDs: string[] | undefined,
  qualifiersByID: Record<string, Qualifier>
) {
  if (!qualifierIDs?.length) {
    return <div className="text-xs text-muted-foreground">No qualifiers</div>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {qualifierIDs.map((qualifierID) => (
        <Badge key={qualifierID} variant="outline">
          {qualifiersByID[qualifierID]?.label || qualifierID}
        </Badge>
      ))}
    </div>
  )
}

export function DomainModelsInspectorPane({
  boundExampleDocumentIDs,
  deleting,
  draft,
  entityTypeDraft,
  filteredTaxonomyNodes,
  initialDocumentTypes,
  inspectorTarget,
  isDirty,
  onDelete,
  onSave,
  onSetDraft,
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
}: Props) {
  let title = "Inspector"
  let description = "Selection-driven details for the active modeling workspace."
  let content: React.ReactNode = null

  if (inspectorTarget.kind === "attribute_usage" && selectedAttributeUsage.attributeUsage) {
    const usage = selectedAttributeUsage.attributeUsage
    const entityUsage = selectedAttributeUsage.entityUsage
    title = usage.label || "Attribute Usage"
    description = "Context-specific attribute behavior in the selected entity usage."
    content = (
      <div className="grid gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Entity Usage</div>
          <div className="font-medium">{entityUsage?.label || entityUsage?.entity_type_id}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Applicability</div>
          <div>{usage.applicability || "allowed"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Required</div>
          <div>{usage.required ? "Yes" : "No"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Description</div>
          <div>{usage.description || "No description"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Qualifiers</div>
          {renderQualifierBadges(usage.qualifier_ids, qualifiersByID)}
        </div>
      </div>
    )
  } else if (inspectorTarget.kind === "entity_usage" && selectedEntityUsage) {
    title = selectedEntityUsage.label || "Entity Usage"
    description = "Context-specific entity usage in the active profile."
    content = (
      <div className="grid gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Entity Type</div>
          <div className="font-medium">{selectedEntityUsage.entity_type_id}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Cardinality</div>
          <div>{selectedEntityUsage.cardinality}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Applicability</div>
          <div>{selectedEntityUsage.applicability || "allowed"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Required</div>
          <div>{selectedEntityUsage.required ? "Yes" : "No"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Attributes</div>
          <div>{selectedEntityUsage.attributes?.length ?? 0}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Qualifiers</div>
          {renderQualifierBadges(selectedEntityUsage.qualifier_ids, qualifiersByID)}
        </div>
      </div>
    )
  } else if (inspectorTarget.kind === "attribute_type" && selectedAttributeType) {
    title = selectedAttributeType.label || selectedAttributeType.name || "Canonical Attribute"
    description = "Canonical attribute definition from the reusable entity library."
    content = (
      <div className="grid gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Name</div>
          <div className="font-medium">{selectedAttributeType.name || "Untitled attribute"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Value Type</div>
          <div>{selectedAttributeType.value_type}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Cardinality</div>
          <div>{selectedAttributeType.cardinality}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Target Entity</div>
          <div>{selectedAttributeType.target_entity_type_id || "None"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Required by Default</div>
          <div>{selectedAttributeType.required ? "Yes" : "No"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Allowed Qualifiers</div>
          {renderQualifierBadges(selectedAttributeType.allowed_qualifier_ids, qualifiersByID)}
        </div>
      </div>
    )
  } else if (inspectorTarget.kind === "entity_type") {
    title = entityTypeDraft.label || selectedEntityType?.label || "Canonical Entity"
    description = "Reusable entity definition available across context profiles."
    content = (
      <div className="grid gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Entity Type ID</div>
          <div className="font-medium">{selectedEntityType?.entity_type_id || "New entity"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Scope</div>
          <div>{entityTypeDraft.source_scope}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Status</div>
          <div>{entityTypeDraft.status}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Base Attributes</div>
          <div>{entityTypeDraft.attributes.length}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Description</div>
          <div>{entityTypeDraft.description || "No description"}</div>
        </div>
      </div>
    )
  } else {
    title = draft.label || "Context Profile"
    description = "Edit the active profile context here, then shape entities and attributes in the composer."
    content = (
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="context-profile-label">Label</Label>
            <Input
              id="context-profile-label"
              value={draft.label}
              onChange={(event) =>
                onSetDraft((current) => ({ ...current, label: event.target.value }))
              }
              placeholder="Finance / Invoice"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="context-profile-document-type">Document Type</Label>
            <Select
              value={draft.document_type || "__any__"}
              onValueChange={(value) =>
                onSetDraft((current) => ({
                  ...current,
                  document_type: value === "__any__" ? "" : value,
                }))
              }
            >
              <SelectTrigger id="context-profile-document-type">
                <SelectValue placeholder="Any document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any document type</SelectItem>
                {initialDocumentTypes.map((documentType) => (
                  <SelectItem key={documentType.id} value={documentType.name}>
                    {documentType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          <div className="grid gap-2">
            <Label htmlFor="context-profile-taxonomy">Taxonomy Node</Label>
            <Select
              value={
                filteredTaxonomyNodes.some((node) => node.taxonomy_node_id === draft.taxonomy_node_id)
                  ? draft.taxonomy_node_id
                  : "__none__"
              }
              onValueChange={(value) =>
                onSetDraft((current) => ({
                  ...current,
                  taxonomy_node_id: value === "__none__" ? "" : value,
                }))
              }
            >
              <SelectTrigger id="context-profile-taxonomy">
                <SelectValue placeholder="No taxonomy constraint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No taxonomy constraint</SelectItem>
                {filteredTaxonomyNodes.map((node) => (
                  <SelectItem key={node.taxonomy_node_id} value={node.taxonomy_node_id}>
                    {node.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="context-profile-status">Status</Label>
            <Select
              value={draft.status}
              onValueChange={(value) =>
                onSetDraft((current) => ({ ...current, status: value }))
              }
            >
              <SelectTrigger id="context-profile-status">
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
            <Label htmlFor="context-profile-scope">Source Scope</Label>
            <Select
              value={draft.source_scope}
              onValueChange={(value) =>
                onSetDraft((current) => ({
                  ...current,
                  source_id: value === "link_global" ? "" : current.source_id || sourceID,
                  source_scope: value,
                }))
              }
            >
              <SelectTrigger id="context-profile-scope">
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

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="grid gap-2">
            <Label htmlFor="context-profile-description">Description</Label>
            <Textarea
              id="context-profile-description"
              value={draft.description}
              onChange={(event) =>
                onSetDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Describe the context, expected evidence, and extraction intent."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="context-profile-source-id">Source ID</Label>
            <Input
              id="context-profile-source-id"
              value={draft.source_scope === "link_global" ? "" : draft.source_id}
              disabled={draft.source_scope === "link_global"}
              onChange={(event) =>
                onSetDraft((current) => ({
                  ...current,
                  source_id: event.target.value,
                }))
              }
              placeholder={sourceID}
            />
          </div>
        </div>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="font-medium">Context Preview</div>
          <div className="mt-2">
            {taxonomyPath || "Any taxonomy branch"}
            {" • "}
            {draft.document_type || "Any Paperless document type"}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {draft.entity_usages.length} entities configured • {boundExampleDocumentIDs.size} bound examples
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {selectedProfile ? (
            <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleting || saving}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete
            </Button>
          ) : null}
          <Button size="sm" onClick={onSave} disabled={saving || !draft.label.trim() || !isDirty}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Context
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className="min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 flex-col">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto">{content}</CardContent>
      </div>
    </Card>
  )
}
