"use client"

import * as React from "react"
import {
  Check,
  ChevronsUpDown,
  Loader2,
  RefreshCcw,
  Save,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useRealtimeDocumentRefresh } from "@/hooks/use-realtime-document-refresh"
import { cn } from "@/lib/utils"
import { getJson, putJson, withQuery } from "@/lib/paperless-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type DocumentTypeItem = {
  id: number
  name: string
}

type ContextDocument = {
  document_type?: number | null
  title?: string
}

type TaxonomyNode = {
  depth: number
  label: string
  node_type?: string
  path: string
  source_id?: string
  source_scope?: string
  taxonomy_node_id: string
}

type TaxonomyAssignment = {
  assignment_id: string
  is_primary?: boolean
  taxonomy_node_id: string
  taxonomy_path: string
}

type TaxonomyAssignmentContext = {
  ancestors?: TaxonomyNode[]
  assignment: TaxonomyAssignment
  node?: TaxonomyNode
}

type DomainModelDefinition = {
  definition_id: string
  document_type?: string
  entities?: Array<{ attributes?: unknown[]; entity_type: string }>
  label: string
  taxonomy_path?: string
  version: number
}

type DocumentContext = {
  assignments?: TaxonomyAssignmentContext[]
  document_id?: string
  document_type?: string
  matched_definitions?: DomainModelDefinition[]
  source_id?: string
}

type Props = {
  canChangeDocument: boolean
  documentId: number
  documentTypes: DocumentTypeItem[]
}

function resolveDocumentTypeName(
  documentTypeId: number | null | undefined,
  documentTypes: DocumentTypeItem[]
) {
  if (documentTypeId == null) return ""
  return documentTypes.find((item) => item.id === documentTypeId)?.name ?? ""
}

function sortedNodeIDs(values: string[]) {
  return [...values].sort((left, right) => left.localeCompare(right))
}

function assignmentNodeIDs(
  assignments: TaxonomyAssignmentContext[] | undefined
) {
  return sortedNodeIDs(
    (assignments ?? []).map(
      (assignment) => assignment.assignment.taxonomy_node_id
    )
  )
}

function primaryAssignmentNodeID(
  assignments: TaxonomyAssignmentContext[] | undefined
) {
  return (
    (assignments ?? []).find((assignment) => assignment.assignment.is_primary)
      ?.assignment.taxonomy_node_id ?? ""
  )
}

function entityCount(definition: DomainModelDefinition) {
  return definition.entities?.length ?? 0
}

function attributeCount(definition: DomainModelDefinition) {
  return (definition.entities ?? []).reduce((total, entity) => {
    return total + (entity.attributes?.length ?? 0)
  }, 0)
}

export function DocumentContextTab({
  canChangeDocument,
  documentId,
  documentTypes,
}: Props) {
  const [document, setDocument] = React.useState<ContextDocument | null>(null)
  const [nodes, setNodes] = React.useState<TaxonomyNode[]>([])
  const [context, setContext] = React.useState<DocumentContext | null>(null)
  const [selectedNodeIDs, setSelectedNodeIDs] = React.useState<string[]>([])
  const [primaryNodeID, setPrimaryNodeID] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const refreshToken = useRealtimeDocumentRefresh({
    documentId,
    enabled: true,
  })

  const loadContext = React.useCallback(async () => {
    setLoading(true)

    try {
      const [nodesResponse, documentResponse] = await Promise.all([
        getJson<{ nodes?: TaxonomyNode[] }>("/api/link-iq/taxonomy/nodes"),
        getJson<ContextDocument>(
          `/api/proxy/documents/${documentId}/?full_perms=true`
        ),
      ])

      const documentTypeName = resolveDocumentTypeName(
        documentResponse.document_type,
        documentTypes
      )
      const contextResponse = await getJson<DocumentContext>(
        withQuery(`/api/link-iq/documents/${documentId}/context`, {
          document_type: documentTypeName,
        })
      )

      setNodes(
        (nodesResponse.nodes ?? []).sort((left, right) =>
          left.path.localeCompare(right.path)
        )
      )
      setDocument(documentResponse)
      setContext(contextResponse)
      setSelectedNodeIDs(assignmentNodeIDs(contextResponse.assignments))
      setPrimaryNodeID(primaryAssignmentNodeID(contextResponse.assignments))
    } catch (error) {
      console.error(error)
      toast.error("Failed to load document context", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }, [documentId, documentTypes])

  React.useEffect(() => {
    void loadContext()
  }, [loadContext, refreshToken])

  const documentTypeName = resolveDocumentTypeName(
    document?.document_type,
    documentTypes
  )
  const selectedAssignments = React.useMemo(() => {
    const byNodeID = new Map(
      (context?.assignments ?? []).map((assignment) => [
        assignment.assignment.taxonomy_node_id,
        assignment,
      ])
    )

    return selectedNodeIDs
      .map((taxonomyNodeID) => {
        const existing = byNodeID.get(taxonomyNodeID)
        if (existing) return existing

        const node = nodes.find(
          (item) => item.taxonomy_node_id === taxonomyNodeID
        )
        if (!node) return null

        return {
          assignment: {
            assignment_id: `draft:${taxonomyNodeID}`,
            is_primary: taxonomyNodeID === primaryNodeID,
            taxonomy_node_id: taxonomyNodeID,
            taxonomy_path: node.path,
          },
          node,
        } satisfies TaxonomyAssignmentContext
      })
      .filter((value): value is TaxonomyAssignmentContext => value !== null)
      .sort((left, right) => {
        const leftPrimary = left.assignment.taxonomy_node_id === primaryNodeID
        const rightPrimary = right.assignment.taxonomy_node_id === primaryNodeID
        if (leftPrimary !== rightPrimary) return leftPrimary ? -1 : 1
        return left.assignment.taxonomy_path.localeCompare(
          right.assignment.taxonomy_path
        )
      })
  }, [context?.assignments, nodes, primaryNodeID, selectedNodeIDs])

  const availableNodes = React.useMemo(() => {
    const selected = new Set(selectedNodeIDs)
    return nodes.filter((node) => !selected.has(node.taxonomy_node_id))
  }, [nodes, selectedNodeIDs])

  const taxonomyTreeRows = React.useMemo(() => {
    return nodes.map((node) => {
      const depth = Math.max(0, node.path.split("/").filter(Boolean).length - 1)
      return {
        node,
        depth,
        selected: selectedNodeIDs.includes(node.taxonomy_node_id),
      }
    })
  }, [nodes, selectedNodeIDs])

  const isDirty = React.useMemo(() => {
    const baselineNodeIDs = assignmentNodeIDs(context?.assignments)
    const currentNodeIDs = sortedNodeIDs(selectedNodeIDs)
    if (baselineNodeIDs.length !== currentNodeIDs.length) return true
    if (baselineNodeIDs.some((value, index) => value !== currentNodeIDs[index]))
      return true
    return primaryAssignmentNodeID(context?.assignments) !== primaryNodeID
  }, [context?.assignments, primaryNodeID, selectedNodeIDs])

  const addNode = React.useCallback((taxonomyNodeID: string) => {
    setSelectedNodeIDs((current) => {
      if (current.includes(taxonomyNodeID)) return current
      return [...current, taxonomyNodeID]
    })
    setPrimaryNodeID((current) => current || taxonomyNodeID)
    setPickerOpen(false)
  }, [])

  const removeNode = React.useCallback((taxonomyNodeID: string) => {
    setSelectedNodeIDs((current) => {
      const remaining = current.filter((value) => value !== taxonomyNodeID)
      setPrimaryNodeID((activePrimaryNodeID) => {
        if (activePrimaryNodeID !== taxonomyNodeID) return activePrimaryNodeID
        return remaining[0] ?? ""
      })
      return remaining
    })
  }, [])

  const resetSelection = React.useCallback(() => {
    setSelectedNodeIDs(assignmentNodeIDs(context?.assignments))
    setPrimaryNodeID(primaryAssignmentNodeID(context?.assignments))
  }, [context?.assignments])

  const saveAssignments = React.useCallback(async () => {
    setSaving(true)
    try {
      const nextContext = await putJson<DocumentContext>(
        `/api/link-iq/documents/${documentId}/context`,
        {
          document_type: documentTypeName,
          primary_taxonomy_node_id:
            selectedNodeIDs.length > 0
              ? primaryNodeID || selectedNodeIDs[0]
              : "",
          taxonomy_node_ids: selectedNodeIDs,
        }
      )

      setContext(nextContext)
      setSelectedNodeIDs(assignmentNodeIDs(nextContext.assignments))
      setPrimaryNodeID(primaryAssignmentNodeID(nextContext.assignments))
      toast.success("Document context updated")
    } catch (error) {
      console.error(error)
      toast.error("Failed to update document context", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }, [documentId, documentTypeName, primaryNodeID, selectedNodeIDs])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-3 px-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Loading Link context…
        </span>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-6 pt-4 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Document Context</h3>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Assign this document to one or more Link taxonomy nodes, then
            inspect which domain definitions match the current repository
            document type.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadContext()}
        >
          <RefreshCcw className="mr-2 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Repository Context</CardTitle>
            <CardDescription>
              Current Paperless metadata that shapes Link context resolution.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Document type
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{documentTypeName || "Unset"}</Badge>
              </div>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Link assignments
              </div>
              <div className="mt-2 text-sm font-medium">
                {selectedAssignments.length} node
                {selectedAssignments.length === 1 ? "" : "s"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resolved Domain Context</CardTitle>
            <CardDescription>
              Domain models that currently match this document type and taxonomy
              assignment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {context?.matched_definitions?.length ? (
              context.matched_definitions.map((definition) => (
                <div
                  key={definition.definition_id}
                  className="rounded-md border bg-muted/20 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium">
                      {definition.label}
                    </div>
                    <Badge variant="secondary">v{definition.version}</Badge>
                    {definition.document_type ? (
                      <Badge variant="outline">
                        {definition.document_type}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {definition.taxonomy_path || "No taxonomy path constraint"}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{entityCount(definition)} entities</span>
                    <span>{attributeCount(definition)} attributes</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No domain model currently matches this document context.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="min-h-[320px]">
        <CardHeader>
          <CardTitle>Taxonomy Assignment</CardTitle>
          <CardDescription>
            Multiple taxonomy nodes are allowed. Mark one primary node to
            indicate the dominant extraction context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/20 p-2">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Taxonomy hierarchy
            </div>
            <div className="max-h-52 overflow-auto pr-1">
              {taxonomyTreeRows.map(({ node, depth, selected }) => (
                <div
                  key={node.taxonomy_node_id}
                  className={cn(
                    "flex items-center justify-between rounded px-2 py-1.5 text-sm",
                    selected ? "bg-accent/20" : "hover:bg-muted/50"
                  )}
                  style={{ paddingLeft: `${Math.min(depth, 8) * 12 + 8}px` }}
                >
                  <span className="truncate">{node.path}</span>
                  {selected ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      disabled={!canChangeDocument}
                      onClick={() => removeNode(node.taxonomy_node_id)}
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2"
                      disabled={!canChangeDocument}
                      onClick={() => addNode(node.taxonomy_node_id)}
                    >
                      Add
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-[260px] justify-between"
                  disabled={!canChangeDocument}
                >
                  Add taxonomy node
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search taxonomy paths..." />
                  <CommandList>
                    <CommandEmpty>No taxonomy nodes available.</CommandEmpty>
                    <CommandGroup>
                      {availableNodes.map((node) => (
                        <CommandItem
                          key={node.taxonomy_node_id}
                          value={`${node.path} ${node.label} ${node.node_type || ""}`}
                          onSelect={() => addNode(node.taxonomy_node_id)}
                        >
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm">
                              {node.path}
                            </span>
                            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {node.node_type ? (
                                <span className="rounded-full border px-1.5 py-0.5 font-medium text-foreground/75">
                                  {node.node_type}
                                </span>
                              ) : null}
                              <span>
                                {node.source_scope === "link_global"
                                  ? "Global taxonomy"
                                  : node.source_id || "Scoped taxonomy"}
                              </span>
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Badge variant="outline">
              {selectedAssignments.length} selected
            </Badge>
            {primaryNodeID ? <Badge>Primary set</Badge> : null}
          </div>

          {selectedAssignments.length > 0 ? (
            <div className="grid gap-3">
              {selectedAssignments.map((assignment) => {
                const taxonomyNodeID = assignment.assignment.taxonomy_node_id
                const isPrimary = primaryNodeID === taxonomyNodeID

                return (
                  <div
                    key={taxonomyNodeID}
                    className={cn(
                      "flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between",
                      isPrimary && "border-accent bg-accent/5"
                    )}
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-medium">
                          {assignment.assignment.taxonomy_path}
                        </div>
                        {isPrimary ? <Badge>Primary</Badge> : null}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {assignment.node?.node_type ? (
                          <span>Type: {assignment.node.node_type}</span>
                        ) : null}
                        <span>
                          {assignment.node?.source_scope || "link_global"}
                        </span>
                        {assignment.node?.source_id ? (
                          <span>Source: {assignment.node.source_id}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!isPrimary ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!canChangeDocument}
                          onClick={() => setPrimaryNodeID(taxonomyNodeID)}
                        >
                          <Check className="mr-2 h-3.5 w-3.5" />
                          Set primary
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!canChangeDocument}
                        onClick={() => removeNode(taxonomyNodeID)}
                      >
                        <X className="mr-2 h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              No taxonomy nodes assigned yet.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <Button
              type="button"
              onClick={() => void saveAssignments()}
              disabled={!canChangeDocument || !isDirty || saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save assignments
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty || saving}
              onClick={resetSelection}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
