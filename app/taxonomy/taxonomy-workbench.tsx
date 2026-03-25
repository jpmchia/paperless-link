"use client"

import * as React from "react"
import {
  AlertCircle,
  ChevronRight,
  GitBranch,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
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

  const selectedNode = React.useMemo(
    () => nodes.find((node) => node.taxonomy_node_id === selectedNodeID) ?? null,
    [nodes, selectedNodeID]
  )

  React.useEffect(() => {
    setDraft(buildDraft(selectedNode, sourceID))
  }, [selectedNode, sourceID])

  const filteredNodes = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return nodes

    return nodes.filter((node) => {
      return (
        node.label.toLowerCase().includes(query) ||
        node.path.toLowerCase().includes(query) ||
        (node.description || "").toLowerCase().includes(query)
      )
    })
  }, [nodes, search])

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

  const rootCount = React.useMemo(
    () => nodes.filter((node) => node.depth === 0).length,
    [nodes]
  )
  const sourceBoundCount = React.useMemo(
    () => nodes.filter((node) => node.source_scope !== "link_global").length,
    [nodes]
  )

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Total Nodes</CardTitle>
            <CardDescription>Link-native hierarchy currently defined.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{nodes.length}</CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Root Branches</CardTitle>
            <CardDescription>Top-level entry points into the taxonomy.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{rootCount}</CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Source-Bound Nodes</CardTitle>
            <CardDescription>Scoped to the active repository connector.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {sourceBoundCount}
          </CardContent>
        </Card>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]">
        <Card className="min-h-0">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Taxonomy Browser</CardTitle>
                <CardDescription>
                  Search the existing hierarchy and select a node to edit.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
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
                <Button
                  size="sm"
                  onClick={() => setSelectedNodeID("__new__")}
                >
                  <Plus className="size-4" />
                  New Node
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
            <Input
              placeholder="Search taxonomy path, label, or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
              {filteredNodes.length === 0 ? (
                <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                  <AlertCircle className="size-4" />
                  <p>No taxonomy nodes match the current search.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNodes.map((node) => {
                    const isActive = node.taxonomy_node_id === selectedNodeID
                    return (
                      <button
                        key={node.taxonomy_node_id}
                        type="button"
                        className={cn(
                          "flex w-full flex-col gap-2 px-3 py-3 text-left transition-colors hover:bg-muted/50",
                          isActive && "bg-muted"
                        )}
                        onClick={() => setSelectedNodeID(node.taxonomy_node_id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <ChevronRight
                              className="size-4 shrink-0 text-muted-foreground"
                              style={{ marginLeft: node.depth * 10 }}
                            />
                            <span className="truncate font-medium">{node.label}</span>
                          </div>
                          <Badge variant={node.status === "active" ? "secondary" : "outline"}>
                            {node.status}
                          </Badge>
                        </div>
                        <div className="pl-6 text-[11px] text-muted-foreground">
                          {node.path}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid min-h-0 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>
                    {selectedNode ? "Edit Taxonomy Node" : "Create Taxonomy Node"}
                  </CardTitle>
                  <CardDescription>
                    Define the hierarchy path, scoping, and projection state for Link.
                  </CardDescription>
                </div>
                {selectedNode ? (
                  <Badge variant="outline">{selectedNode.taxonomy_node_id}</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
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
                  <select
                    id="taxonomy-parent"
                    className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs"
                    value={draft.parent_node_id}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        parent_node_id: event.target.value,
                      }))
                    }
                  >
                    <option value="">No parent (root)</option>
                    {availableParents.map((node) => (
                      <option key={node.taxonomy_node_id} value={node.taxonomy_node_id}>
                        {node.path}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="grid gap-2">
                  <Label htmlFor="taxonomy-status">Status</Label>
                  <select
                    id="taxonomy-status"
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
                  <Label htmlFor="taxonomy-scope">Source Scope</Label>
                  <select
                    id="taxonomy-scope"
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
                <div className="grid gap-2">
                  <Label htmlFor="taxonomy-mapping-state">Mapping State</Label>
                  <select
                    id="taxonomy-mapping-state"
                    className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs"
                    value={draft.mapping_state}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        mapping_state: event.target.value,
                      }))
                    }
                  >
                    {mappingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="grid gap-2">
                  <Label htmlFor="taxonomy-description">Description</Label>
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

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground">
                  Root nodes create top-level contexts. Child nodes derive their path
                  and depth from the selected parent.
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
