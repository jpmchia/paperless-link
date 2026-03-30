"use client"

import * as React from "react"
import { GitBranch, Loader2, Plus, RefreshCcw, Save, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { TaxonomyFlowSurface } from "./taxonomy-flow-surface"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/draggable-dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { deleteJson, getJson, postJson } from "@/lib/paperless-client"

type TaxonomyNode = {
  created_at?: string
  depth: number
  description?: string
  label: string
  mapping_state: string
  parent_node_id?: string
  path: string
  sort_order?: number
  source_id?: string
  source_scope: string
  status: string
  taxonomy_node_id: string
  updated_at?: string
}

type TaxonomyNodeDraft = {
  description: string
  label: string
  mapping_state: string
  parent_node_id: string
  sort_order: string
  source_id: string
  source_scope: string
  status: string
  taxonomy_node_id: string
}

type Props = {
  initialNodes: TaxonomyNode[]
  sourceID: string
}

const scopeOptions = [
  { label: "Link Global", value: "link_global" },
  { label: "Source Specific", value: "source_specific" },
  { label: "Source Aligned", value: "source_aligned" },
]

const ROOT_PARENT_VALUE = "__root__"

const mappingOptions = [
  { label: "None", value: "none" },
  { label: "Partial", value: "partial" },
  { label: "Full", value: "full" },
]

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
]

function sortNodes(nodes: TaxonomyNode[]) {
  return [...nodes].sort((left, right) => left.path.localeCompare(right.path))
}

function buildDraft(node: TaxonomyNode | null, sourceID: string): TaxonomyNodeDraft {
  if (!node) {
    return {
      description: "",
      label: "",
      mapping_state: "none",
      parent_node_id: "",
      sort_order: "",
      source_id: "",
      source_scope: "link_global",
      status: "active",
      taxonomy_node_id: "",
    }
  }

  return {
    description: node.description ?? "",
    label: node.label,
    mapping_state: node.mapping_state || "none",
    parent_node_id: node.parent_node_id ?? "",
    sort_order:
      typeof node.sort_order === "number" && node.sort_order !== 0
        ? String(node.sort_order)
        : "",
    source_id: node.source_scope === "link_global" ? "" : node.source_id || sourceID,
    source_scope: node.source_scope || "link_global",
    status: node.status || "active",
    taxonomy_node_id: node.taxonomy_node_id,
  }
}

function serializeDraft(draft: TaxonomyNodeDraft) {
  return JSON.stringify({
    ...draft,
    description: draft.description.trim(),
    label: draft.label.trim(),
    parent_node_id: draft.parent_node_id.trim(),
    sort_order: draft.sort_order.trim(),
    source_id: draft.source_scope === "link_global" ? "" : draft.source_id.trim(),
  })
}

export function TaxonomyWorkbench({ initialNodes, sourceID }: Props) {
  const [nodes, setNodes] = React.useState(() => sortNodes(initialNodes))
  const [selectedNodeID, setSelectedNodeID] = React.useState(
    initialNodes[0]?.taxonomy_node_id ?? "__new__"
  )
  const [draft, setDraft] = React.useState<TaxonomyNodeDraft>(() =>
    buildDraft(initialNodes[0] ?? null, sourceID)
  )
  const [search, setSearch] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)
  const [generatingDescription, setGeneratingDescription] = React.useState(false)
  const [editorOpen, setEditorOpen] = React.useState(true)

  const selectedNode = React.useMemo(
    () => nodes.find((node) => node.taxonomy_node_id === selectedNodeID) ?? null,
    [nodes, selectedNodeID]
  )

  React.useEffect(() => {
    setDraft(buildDraft(selectedNode, sourceID))
  }, [selectedNode, sourceID])

  React.useEffect(() => {
    setEditorOpen(true)
  }, [selectedNodeID])

  const availableParents = React.useMemo(() => {
    const selectedPath = selectedNode?.path || ""
    return nodes.filter((node) => {
      if (node.taxonomy_node_id === selectedNodeID) return false
      if (!selectedPath) return true
      return !node.path.startsWith(`${selectedPath} > `)
    })
  }, [nodes, selectedNode, selectedNodeID])

  const parentNode = React.useMemo(
    () => nodes.find((node) => node.taxonomy_node_id === draft.parent_node_id) ?? null,
    [draft.parent_node_id, nodes]
  )

  const pathPreview = React.useMemo(() => {
    const label = draft.label.trim()
    if (!label) return parentNode?.path || "Add a label to preview the path"
    return parentNode ? `${parentNode.path} > ${label}` : label
  }, [draft.label, parentNode])

  const isDirty = React.useMemo(() => {
    return serializeDraft(draft) !== serializeDraft(buildDraft(selectedNode, sourceID))
  }, [draft, selectedNode, sourceID])

  React.useEffect(() => {
    void reloadNodes(selectedNodeID !== "__new__" ? selectedNodeID : undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function reloadNodes(nextSelectedNodeID?: string) {
    setRefreshing(true)
    try {
      const response = await getJson<{ nodes?: TaxonomyNode[] }>(
        "/api/link-iq/taxonomy/nodes?status=all"
      )
      const nextNodes = sortNodes(response.nodes ?? [])
      setNodes(nextNodes)

      const fallbackNodeID = nextNodes[0]?.taxonomy_node_id ?? "__new__"
      const resolvedSelectedNodeID =
        nextSelectedNodeID &&
        nextNodes.some((node) => node.taxonomy_node_id === nextSelectedNodeID)
          ? nextSelectedNodeID
          : selectedNodeID !== "__new__" &&
              nextNodes.some((node) => node.taxonomy_node_id === selectedNodeID)
            ? selectedNodeID
            : fallbackNodeID

      setSelectedNodeID(resolvedSelectedNodeID)
    } catch (error) {
      toast.error("Failed to reload taxonomy", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setRefreshing(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        description: draft.description.trim() || undefined,
        label: draft.label.trim(),
        mapping_state: draft.mapping_state,
        parent_node_id: draft.parent_node_id || undefined,
        sort_order: draft.sort_order.trim()
          ? Number.parseInt(draft.sort_order, 10)
          : undefined,
        source_id:
          draft.source_scope === "link_global"
            ? undefined
            : draft.source_id.trim() || sourceID,
        source_scope: draft.source_scope,
        status: draft.status,
        taxonomy_node_id: draft.taxonomy_node_id || undefined,
      }

      const node = await postJson<TaxonomyNode>("/api/link-iq/taxonomy/nodes", payload)
      toast.success(
        draft.taxonomy_node_id ? "Taxonomy node updated" : "Taxonomy node created"
      )
      await reloadNodes(node.taxonomy_node_id)
    } catch (error) {
      toast.error("Failed to save taxonomy node", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedNode) return
    setDeleting(true)
    try {
      await deleteJson(`/api/link-iq/taxonomy/nodes/${selectedNode.taxonomy_node_id}`)
      toast.success("Taxonomy node deleted")
      await reloadNodes("__new__")
    } catch (error) {
      toast.error("Failed to delete taxonomy node", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDeleting(false)
    }
  }

  async function handleMoveNode(nodeID: string, parentNodeID: string | null) {
    await postJson(`/api/link-iq/taxonomy/nodes/${nodeID}/move`, {
      parent_node_id: parentNodeID || undefined,
    })
    toast.success("Taxonomy node moved")
    await reloadNodes(nodeID)
  }

  async function handleGenerateDescription() {
    if (!draft.label.trim()) {
      toast.error("Add a node label before generating a description")
      return
    }

    setGeneratingDescription(true)
    try {
      const result = await postJson<{ output_text?: string }>(
        "/api/link-iq/ai/generate/taxonomy-description",
        {
          existing_description: draft.description,
          label: draft.label,
          parent_path: parentNode?.path || "",
          path_preview: pathPreview,
          source_id: draft.source_id || sourceID,
          source_scope: draft.source_scope,
        }
      )

      const nextDescription = result.output_text?.trim()
      if (!nextDescription) {
        throw new Error("The configured model returned no description")
      }

      setDraft((current) => ({ ...current, description: nextDescription }))
      toast.success("Description generated")
    } catch (error) {
      toast.error("Failed to generate taxonomy description", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setGeneratingDescription(false)
    }
  }

  const handleSelectNode = React.useCallback((nodeID: string) => {
    setSelectedNodeID(nodeID)
    setEditorOpen(true)
  }, [])

  const handleCreateNode = React.useCallback(() => {
    setSelectedNodeID("__new__")
    setEditorOpen(true)
  }, [])

  return (
    <div className="flex min-h-0 flex-1 p-6">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="absolute inset-0">
          <TaxonomyFlowSurface
            nodes={nodes}
            search={search}
            selectedNodeID={selectedNodeID}
            onMoveNode={handleMoveNode}
            onSelectNode={handleSelectNode}
            layoutInsetLeft={40}
            layoutInsetTop={116}
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-4">
          <div className="pointer-events-auto flex w-full max-w-4xl items-center gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <Input
              placeholder="Search taxonomy path, label, or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => void reloadNodes()}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCcw className="size-4" />
              )}
              Refresh
            </Button>
            <Button size="sm" onClick={handleCreateNode}>
              <Plus className="size-4" />
              New Node
            </Button>
          </div>
        </div>

        <Dialog modal={false} open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent
            overlay={false}
            draggable
            resizable
            initialWidth={520}
            initialHeight={760}
            minWidth={420}
            maxWidth={760}
            minHeight={520}
            maxHeight={920}
            onInteractOutside={(event) => event.preventDefault()}
          >
            <DialogHeader
              headerRight={
                selectedNode ? (
                  <Badge variant="outline">{selectedNode.taxonomy_node_id}</Badge>
                ) : (
                  <Badge variant="secondary">New node</Badge>
                )
              }
            >
              <DialogTitle>
                {selectedNode ? "Edit Taxonomy Node" : "Create Taxonomy Node"}
              </DialogTitle>
              <DialogDescription>
                Define the hierarchy path, scoping, and projection state for Link.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="taxonomy-label">Label</Label>
                <Input
                  id="taxonomy-label"
                  value={draft.label}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder="Invoice > Utilities"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="taxonomy-parent">Parent Node</Label>
                <Select
                  value={draft.parent_node_id || ROOT_PARENT_VALUE}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      parent_node_id: value === ROOT_PARENT_VALUE ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger id="taxonomy-parent" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROOT_PARENT_VALUE}>No parent (root)</SelectItem>
                    {availableParents.map((node) => (
                      <SelectItem key={node.taxonomy_node_id} value={node.taxonomy_node_id}>
                        {node.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="taxonomy-status">Status</Label>
                  <Select
                    value={draft.status}
                    onValueChange={(value) =>
                      setDraft((current) => ({ ...current, status: value }))
                    }
                  >
                    <SelectTrigger id="taxonomy-status" className="w-full">
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
                  <Label htmlFor="taxonomy-scope">Source Scope</Label>
                  <Select
                    value={draft.source_scope}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        source_id:
                          value === "link_global"
                            ? ""
                            : current.source_id || sourceID,
                        source_scope: value,
                      }))
                    }
                  >
                    <SelectTrigger id="taxonomy-scope" className="w-full">
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

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="taxonomy-mapping-state">Mapping State</Label>
                  <Select
                    value={draft.mapping_state}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        mapping_state: value,
                      }))
                    }
                  >
                    <SelectTrigger id="taxonomy-mapping-state" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mappingOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="taxonomy-sort-order">Sort Order</Label>
                  <Input
                    id="taxonomy-sort-order"
                    inputMode="numeric"
                    value={draft.sort_order}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        sort_order: event.target.value.replace(/[^\d-]/g, ""),
                      }))
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="taxonomy-source-id">Source ID</Label>
                <Input
                  id="taxonomy-source-id"
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

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="taxonomy-description">Description</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleGenerateDescription()}
                    disabled={generatingDescription || !draft.label.trim()}
                  >
                    {generatingDescription ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    Generate with AI
                  </Button>
                </div>
                <Textarea
                  id="taxonomy-description"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Explain what this taxonomy node means and when it should be used."
                />
              </div>

              <div className="rounded-md border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <GitBranch className="size-4" />
                  Path Preview
                </div>
                <div className="mt-2 text-sm">{pathPreview}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Depth {parentNode ? parentNode.depth + 1 : 0}
                  {draft.source_scope !== "link_global"
                    ? `, source ${draft.source_id.trim() || sourceID}`
                    : ", global scope"}
                </div>
              </div>
            </DialogBody>

            <DialogFooter className="items-center justify-between gap-3 border-t pt-4">
              <div className="text-[11px] text-muted-foreground">
                Root nodes create top-level contexts. Child nodes derive their path and
                depth from the selected parent.
              </div>
              <div className="flex items-center gap-2">
                {selectedNode ? (
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
                  disabled={saving || !draft.label.trim() || !isDirty}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save Node
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
