"use client"

import * as React from "react"
import type { DataroomFolder } from "@/lib/link-iq-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Building2, FileType, GitBranch, Users } from "lucide-react"

type TaxonomyNodeOption = { taxonomy_node_id?: string; label?: string; path?: string }
type DocumentTypeOption = { id: number; name?: string }
type CorrespondentOption = { id: number; name?: string }
type EntityTypeOption = { entity_type_id?: string; label?: string }
type CustomFieldOption = { id: number; name?: string }
type StandardMetadataFieldOption = { key: string; label: string }

type Props = {
  selectedId: string
  treeContent: React.ReactNode
  treeOnly?: boolean
  folderDraft: Partial<DataroomFolder>
  setFolderDraft: React.Dispatch<React.SetStateAction<Partial<DataroomFolder>>>
  saveFolder: () => void
  resetFolderDraft: () => void
  folders: DataroomFolder[]
  selectedTaxonomyNodeID: string
  setSelectedTaxonomyNodeID: (value: string) => void
  taxonomyNodes: TaxonomyNodeOption[]
  addFolderFromCatalog: (
    label: string,
    sourceType?: "taxonomy" | "document_type" | "correspondent" | "domain_entity",
    sourceID?: string,
    sourceLabel?: string,
  ) => void
  includeAllTaxonomyItems: boolean
  setIncludeAllTaxonomyItems: (value: boolean) => void
  selectedTaxonomyNodeLabel: string
  selectedDocumentTypeID: string
  setSelectedDocumentTypeID: (value: string) => void
  documentTypes: DocumentTypeOption[]
  includeAllDocumentTypeItems: boolean
  setIncludeAllDocumentTypeItems: (value: boolean) => void
  selectedDocumentTypeLabel: string
  selectedCorrespondentID: string
  setSelectedCorrespondentID: (value: string) => void
  correspondents: CorrespondentOption[]
  includeAllCorrespondentItems: boolean
  setIncludeAllCorrespondentItems: (value: boolean) => void
  selectedCorrespondentLabel: string
  selectedDomainEntityID: string
  setSelectedDomainEntityID: (value: string) => void
  domainEntities: EntityTypeOption[]
  includeAllDomainEntityItems: boolean
  setIncludeAllDomainEntityItems: (value: boolean) => void
  selectedDomainEntityLabel: string
  customFields: CustomFieldOption[]
  standardMetadataFields: StandardMetadataFieldOption[]
  generatedRulesText: string
  applyGeneratedRules: () => void
  autoPublishTimes: string[]
}

export function FolderHierarchyCard({
  selectedId,
  treeContent,
  treeOnly = false,
  folderDraft,
  setFolderDraft,
  saveFolder,
  resetFolderDraft,
  folders,
  selectedTaxonomyNodeID,
  setSelectedTaxonomyNodeID,
  taxonomyNodes,
  addFolderFromCatalog,
  includeAllTaxonomyItems,
  setIncludeAllTaxonomyItems,
  selectedTaxonomyNodeLabel,
  selectedDocumentTypeID,
  setSelectedDocumentTypeID,
  documentTypes,
  includeAllDocumentTypeItems,
  setIncludeAllDocumentTypeItems,
  selectedDocumentTypeLabel,
  selectedCorrespondentID,
  setSelectedCorrespondentID,
  correspondents,
  includeAllCorrespondentItems,
  setIncludeAllCorrespondentItems,
  selectedCorrespondentLabel,
  selectedDomainEntityID,
  setSelectedDomainEntityID,
  domainEntities,
  includeAllDomainEntityItems,
  setIncludeAllDomainEntityItems,
  selectedDomainEntityLabel,
  customFields,
  standardMetadataFields,
  generatedRulesText,
  applyGeneratedRules,
  autoPublishTimes,
}: Props) {
  if (treeOnly) {
    return (
      <Card className="m-0 h-full min-h-0 p-0">
        <CardContent className="flex h-full min-h-0 flex-col p-4">
          <div className="mb-3 space-y-1">
            <CardTitle>Folder tree</CardTitle>
            <CardDescription>
              Live hierarchy preview with publish status and hold/remove actions.
            </CardDescription>
          </div>
          <div className="min-h-0 flex-1">{treeContent}</div>
        </CardContent>
      </Card>
    )
  }

  const toggleMetadataField = (field: string, checked: boolean) => {
    setFolderDraft((previous) => {
      const current = new Set(previous.published_metadata_fields ?? [])
      if (checked) current.add(field)
      else current.delete(field)
      return { ...previous, published_metadata_fields: Array.from(current) }
    })
  }

  const toggleCustomField = (fieldID: string, checked: boolean) => {
    setFolderDraft((previous) => {
      const current = new Set(previous.published_custom_field_ids ?? [])
      if (checked) current.add(fieldID)
      else current.delete(fieldID)
      return { ...previous, published_custom_field_ids: Array.from(current) }
    })
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-2 gap-4">
      <Card className="m-0 h-full min-h-0 p-0">
        <CardContent className="h-full overflow-auto p-4">
          <div className="space-y-3 text-[13px]">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle>Folder definition</CardTitle>
                <CardDescription>
                  Define folder rules, schedule, and metadata publication settings.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={resetFolderDraft}>
                  New
                </Button>
                <Button onClick={saveFolder} disabled={!selectedId || !folderDraft.label?.trim()}>
                  {folderDraft.folder_id ? "Update folder" : "Add folder to hierarchy"}
                </Button>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <Label className="min-w-[88px] text-[13px]">Parent</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-input/20 px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  value={folderDraft.parent_folder_id ?? "__root__"}
                  onChange={(event) =>
                    setFolderDraft((previous) => ({
                      ...previous,
                      parent_folder_id: event.target.value === "__root__" ? "" : event.target.value,
                    }))
                  }
                >
                  <option value="__root__">Root folder</option>
                  {folders.map((folder) => (
                    <option key={folder.folder_id} value={folder.folder_id}>
                      {folder.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="min-w-[88px] text-[13px]">Folder name</Label>
                <Input
                  className="text-[13px]"
                  placeholder="Folder name"
                  value={folderDraft.label ?? ""}
                  onChange={(event) =>
                    setFolderDraft((previous) => ({ ...previous, label: event.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="min-w-[88px] text-[13px]">Publish</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-input/20 px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  value={
                    folderDraft.auto_publish_immediately == null
                      ? "default"
                      : folderDraft.auto_publish_immediately
                        ? "immediate"
                        : "scheduled"
                  }
                  onChange={(event) =>
                    setFolderDraft((previous) => ({
                      ...previous,
                      auto_publish_immediately:
                        event.target.value === "default" ? undefined : event.target.value === "immediate",
                      auto_publish_scheduled_time:
                        event.target.value === "scheduled"
                          ? previous.auto_publish_scheduled_time || "00:00"
                          : previous.auto_publish_scheduled_time || "",
                    }))
                  }
                >
                  <option value="default">Default (inherit dataroom)</option>
                  <option value="immediate">Immediate</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="min-w-[88px] text-[13px]">Time</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-input/20 px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
                  value={folderDraft.auto_publish_scheduled_time || "00:00"}
                  onChange={(event) =>
                    setFolderDraft((previous) => ({
                      ...previous,
                      auto_publish_scheduled_time: event.target.value,
                    }))
                  }
                  disabled={folderDraft.auto_publish_immediately !== false}
                >
                  {autoPublishTimes.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[13px]">Rules</Label>
                  <Button type="button" variant="outline" size="sm" onClick={applyGeneratedRules}>
                    Generate from current settings
                  </Button>
                </div>
                <Textarea
                  className="text-[13px]"
                  rows={3}
                  placeholder="Plain-English publishing rules for this folder."
                  value={folderDraft.rules ?? ""}
                  onChange={(event) =>
                    setFolderDraft((previous) => ({ ...previous, rules: event.target.value }))
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Suggested: {generatedRulesText}
                </p>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-[13px]">Description</Label>
                <Textarea
                  className="text-[13px]"
                  rows={3}
                  placeholder="Business description of intended folder contents."
                  value={folderDraft.description ?? ""}
                  onChange={(event) =>
                    setFolderDraft((previous) => ({ ...previous, description: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2 py-2">
              {[
                {
                  label: "Taxonomy node",
                  value:
                    folderDraft.linked_item_type === "taxonomy"
                      ? folderDraft.linked_item_id || ""
                      : "",
                  setValue: setSelectedTaxonomyNodeID,
                  options: taxonomyNodes.map((node) => ({
                    key: node.taxonomy_node_id || node.label || "",
                    value: node.taxonomy_node_id || node.label || "",
                    text: node.path || node.label || "(unnamed node)",
                    addLabel: node.path || node.label || "Taxonomy node",
                  })),
                  includeAll:
                    folderDraft.linked_item_type === "taxonomy" &&
                    Boolean(folderDraft.linked_item_id),
                  setIncludeAll: setIncludeAllTaxonomyItems,
                  includeLabel:
                    folderDraft.linked_item_type === "taxonomy"
                      ? folderDraft.linked_item_label || selectedTaxonomyNodeLabel || "(taxonomy node)"
                      : selectedTaxonomyNodeLabel || "(taxonomy node)",
                  sourceType: "taxonomy" as const,
                  icon: GitBranch,
                },
                {
                  label: "Document type",
                  value:
                    folderDraft.linked_item_type === "document_type"
                      ? folderDraft.linked_item_id || ""
                      : "",
                  setValue: setSelectedDocumentTypeID,
                  options: documentTypes.map((item) => ({
                    key: String(item.id),
                    value: String(item.id),
                    text: item.name || `Document type ${item.id}`,
                    addLabel: item.name || `Document type ${item.id}`,
                  })),
                  includeAll:
                    folderDraft.linked_item_type === "document_type" &&
                    Boolean(folderDraft.linked_item_id),
                  setIncludeAll: setIncludeAllDocumentTypeItems,
                  includeLabel:
                    folderDraft.linked_item_type === "document_type"
                      ? folderDraft.linked_item_label || selectedDocumentTypeLabel || "(document type)"
                      : selectedDocumentTypeLabel || "(document type)",
                  sourceType: "document_type" as const,
                  icon: FileType,
                },
                {
                  label: "Correspondent",
                  value:
                    folderDraft.linked_item_type === "correspondent"
                      ? folderDraft.linked_item_id || ""
                      : "",
                  setValue: setSelectedCorrespondentID,
                  options: correspondents.map((item) => ({
                    key: String(item.id),
                    value: String(item.id),
                    text: item.name || `Correspondent ${item.id}`,
                    addLabel: item.name || `Correspondent ${item.id}`,
                  })),
                  includeAll:
                    folderDraft.linked_item_type === "correspondent" &&
                    Boolean(folderDraft.linked_item_id),
                  setIncludeAll: setIncludeAllCorrespondentItems,
                  includeLabel:
                    folderDraft.linked_item_type === "correspondent"
                      ? folderDraft.linked_item_label || selectedCorrespondentLabel || "(correspondent)"
                      : selectedCorrespondentLabel || "(correspondent)",
                  sourceType: "correspondent" as const,
                  icon: Users,
                },
                {
                  label: "Domain entity",
                  value:
                    folderDraft.linked_item_type === "domain_entity"
                      ? folderDraft.linked_item_id || ""
                      : "",
                  setValue: setSelectedDomainEntityID,
                  options: domainEntities.map((item) => ({
                    key: item.entity_type_id || item.label || "",
                    value: item.entity_type_id || item.label || "",
                    text: item.label || item.entity_type_id || "(unnamed entity)",
                    addLabel: item.label || item.entity_type_id || "Domain entity",
                  })),
                  includeAll:
                    folderDraft.linked_item_type === "domain_entity" &&
                    Boolean(folderDraft.linked_item_id),
                  setIncludeAll: setIncludeAllDomainEntityItems,
                  includeLabel:
                    folderDraft.linked_item_type === "domain_entity"
                      ? folderDraft.linked_item_label || selectedDomainEntityLabel || "(domain entity)"
                      : selectedDomainEntityLabel || "(domain entity)",
                  sourceType: "domain_entity" as const,
                  icon: Building2,
                },
              ].map((section) => (
                <div key={section.label} className="space-y-1.5 pt-2">
                  <Label className="flex items-center gap-2 text-[13px]">
                    <section.icon className="size-3.5 text-muted-foreground" />
                    {section.label}
                  </Label>
                  <div className="space-y-2">
                    <div className="grid items-center gap-2 md:grid-cols-[320px_auto]">
                      <select
                        className="h-9 w-[320px] max-w-full rounded-md border border-input bg-input/20 px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                        value={section.value || "__none__"}
                        onChange={(event) => {
                          const nextValue = event.target.value === "__none__" ? "" : event.target.value
                          section.setValue(nextValue)
                          const selected = section.options.find((option) => option.value === nextValue)
                          setFolderDraft((previous) => ({
                            ...previous,
                            linked_item_type: nextValue ? section.sourceType : undefined,
                            linked_item_id: nextValue || undefined,
                            linked_item_label: selected?.text || undefined,
                          }))
                        }}
                      >
                        <option value="__none__">{`Select ${section.label.toLowerCase()}`}</option>
                        {section.options.map((option) => (
                          <option key={option.key} value={option.value}>
                            {option.text}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const selected = section.options.find((option) => option.value === section.value)
                          if (!selected) return
                          addFolderFromCatalog(
                            selected.addLabel,
                            section.sourceType,
                            selected.value,
                            selected.text,
                          )
                        }}
                        disabled={!section.value}
                      >
                        Add to hierarchy
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={section.includeAll}
                        onCheckedChange={(checked) => {
                          const includeAll = Boolean(checked)
                          section.setIncludeAll(includeAll)
                          if (!includeAll) {
                            setFolderDraft((previous) => {
                              if (previous.linked_item_type !== section.sourceType) return previous
                              return {
                                ...previous,
                                linked_item_type: undefined,
                                linked_item_id: undefined,
                                linked_item_label: undefined,
                              }
                            })
                            section.setValue("")
                            return
                          }
                          const selected = section.options.find((option) => option.value === section.value)
                          if (!selected) return
                          setFolderDraft((previous) => ({
                            ...previous,
                            linked_item_type: section.sourceType,
                            linked_item_id: selected.value,
                            linked_item_label: selected.text,
                          }))
                        }}
                      />
                      <Label className="text-[12px] text-white">include all {section.includeLabel} items for this folder</Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-border/60 border-t pt-3">
              <div className="space-y-1">
                <Label className="text-[13px]">Published metadata fields</Label>
                <p className="text-muted-foreground text-xs">
                  Select fields that are released and version controlled for this folder.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {standardMetadataFields.map((field) => {
                  const checked = (folderDraft.published_metadata_fields ?? []).includes(field.key)
                  return (
                    <label key={field.key} className="flex items-center gap-2 border-border/40 border-b px-2 py-1 text-[13px]">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleMetadataField(field.key, Boolean(value))}
                      />
                      <span>{field.label}</span>
                    </label>
                  )
                })}
              </div>
              <div className="space-y-1">
                <Label className="text-[13px]">Published custom fields</Label>
                <p className="text-muted-foreground text-xs">
                  Custom fields selected here are included in release snapshots.
                </p>
              </div>
              <div className="grid max-h-32 gap-2 overflow-auto md:grid-cols-2">
                {customFields.map((field) => {
                  const fieldID = String(field.id)
                  const checked = (folderDraft.published_custom_field_ids ?? []).includes(fieldID)
                  return (
                    <label key={fieldID} className="flex items-center gap-2 border-border/40 border-b px-2 py-1 text-[13px]">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleCustomField(fieldID, Boolean(value))}
                      />
                      <span className="truncate">{field.name || `Custom field ${fieldID}`}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="m-0 h-full min-h-0 p-0">
        <CardContent className="flex h-full min-h-0 flex-col p-4">
          <div className="mb-3 space-y-1">
            <CardTitle>Folder tree</CardTitle>
            <CardDescription>
              Live hierarchy preview with publish status and hold/remove actions.
            </CardDescription>
          </div>
          <div className="min-h-0 flex-1">{treeContent}</div>
        </CardContent>
      </Card>
    </div>
  )
}
