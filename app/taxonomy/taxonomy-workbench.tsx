"use client"

import * as React from "react"
import {
  GitBranch,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { TaxonomyFlowSurface } from "./taxonomy-flow-surface"
import {
  AIGenerationButton,
  type AIGenerationOptionGroup,
} from "@/components/ai/ai-generation-button"
import {
  LLMActivityDialog,
  type LLMAuditEntry,
} from "@/components/ai/llm-activity-dialog"
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
import { normalizeAIProcessAllocation } from "@/lib/ai-processes"
import { appendLLMExecutionEntry, useLLMExecutionEntries } from "@/lib/llm-activity"
import { deleteJson, getJson, postJson } from "@/lib/paperless-client"
import type {
  AIModel,
  AIModelHistoryEntry,
  AIProcessConfig,
  ContextField,
} from "@/lib/link-iq-types"
import type { TextRoleConfig, TextRoleKey } from "@/lib/theme-preset-types"

import { cn } from "@/lib/utils"

type TaxonomyNode = {
  created_at?: string
  depth: number
  description?: string
  label: string
  mapping_state: string
  node_type?: string
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
  node_type: string
  parent_node_id: string
  sort_order: string
  source_id: string
  source_scope: string
  status: string
  taxonomy_node_id: string
}

type TaxonomyPromptContext = {
  business_context: Record<string, string>
  existing_description: string
  label: string
  node_type: string
  parent_path: string
  path_preview: string
  source_id: string
  source_scope: string
}

type Props = {
  configuredNodeTypes: string[]
  initialNodes: TaxonomyNode[]
  sourceID: string
}

const scopeOptions = [
  { label: "Link Global", value: "link_global" },
  { label: "Source Specific", value: "source_specific" },
  { label: "Source Aligned", value: "source_aligned" },
]

const ROOT_PARENT_VALUE = "__root__"
const NO_TYPE_VALUE = "__none__"
const UNCONFIGURED_TYPE_PREFIX = "__unconfigured__:"
const BUSINESS_CONTEXT_SECTION = "business_context"
const TAXONOMY_PROCESS_KEY = "taxonomy.description"

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

function buildDraft(
  node: TaxonomyNode | null,
  sourceID: string
): TaxonomyNodeDraft {
  if (!node) {
    return {
      description: "",
      label: "",
      mapping_state: "none",
      node_type: "",
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
    node_type: node.node_type ?? "",
    parent_node_id: node.parent_node_id ?? "",
    sort_order:
      typeof node.sort_order === "number" && node.sort_order !== 0
        ? String(node.sort_order)
        : "",
    source_id:
      node.source_scope === "link_global" ? "" : node.source_id || sourceID,
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
    node_type: draft.node_type.trim(),
    parent_node_id: draft.parent_node_id.trim(),
    sort_order: draft.sort_order.trim(),
    source_id:
      draft.source_scope === "link_global" ? "" : draft.source_id.trim(),
  })
}

export function TaxonomyWorkbench({
  configuredNodeTypes,
  initialNodes,
  sourceID,
}: Props) {
  const workspaceRef = React.useRef<HTMLDivElement | null>(null)
  const editorPanelRef = React.useRef<HTMLDivElement | null>(null)
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
  const [generatingDescription, setGeneratingDescription] =
    React.useState(false)
  const [editorOpen, setEditorOpen] = React.useState(true)
  const [taxonomyProcess, setTaxonomyProcess] =
    React.useState<AIProcessConfig | null>(null)
  const [aiModels, setAiModels] = React.useState<AIModel[]>([])
  const [businessContextFields, setBusinessContextFields] = React.useState<
    ContextField[]
  >([])
  const [manualGenerationModelID, setManualGenerationModelID] =
    React.useState("")
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [modelAuditLoading, setModelAuditLoading] = React.useState(false)
  const [modelAuditHistory, setModelAuditHistory] = React.useState<
    AIModelHistoryEntry[]
  >([])

  const selectedNode = React.useMemo(
    () =>
      nodes.find((node) => node.taxonomy_node_id === selectedNodeID) ?? null,
    [nodes, selectedNodeID]
  )
  const executionEntries = useLLMExecutionEntries({
    process_key: TAXONOMY_PROCESS_KEY,
  })

  React.useEffect(() => {
    setDraft(buildDraft(selectedNode, sourceID))
  }, [selectedNode, sourceID])

  React.useEffect(() => {
    setEditorOpen(true)
  }, [selectedNodeID])

  React.useEffect(() => {
    async function loadAIGenerationConfig() {
      try {
        const [processResponse, modelResponse, businessContextResponse] =
          await Promise.all([
            getJson<{ processes?: AIProcessConfig[] }>(
              "/api/link-iq/ai/processes?section=taxonomy"
            ),
            getJson<{ models?: AIModel[] }>("/api/link-iq/ai/models"),
            getJson<{ fields?: ContextField[] }>(
              `/api/link-iq/context-fields?section=${BUSINESS_CONTEXT_SECTION}`
            ),
          ])

        const nextProcess = processResponse.processes?.find(
          (process) => process.process_key === TAXONOMY_PROCESS_KEY
        )

        setTaxonomyProcess(
          nextProcess ? normalizeAIProcessAllocation(nextProcess) : null
        )
        setAiModels(modelResponse.models ?? [])
        setBusinessContextFields(businessContextResponse.fields ?? [])
      } catch {
        setTaxonomyProcess(null)
        setAiModels([])
        setBusinessContextFields([])
      }
    }

    void loadAIGenerationConfig()
  }, [])

  const availableParents = React.useMemo(() => {
    const selectedPath = selectedNode?.path || ""
    return nodes.filter((node) => {
      if (node.taxonomy_node_id === selectedNodeID) return false
      if (!selectedPath) return true
      return !node.path.startsWith(`${selectedPath} > `)
    })
  }, [nodes, selectedNode, selectedNodeID])

  const parentNode = React.useMemo(
    () =>
      nodes.find((node) => node.taxonomy_node_id === draft.parent_node_id) ??
      null,
    [draft.parent_node_id, nodes]
  )

  const typeOptions = React.useMemo(() => {
    const configured = configuredNodeTypes
      .map((value) => value.trim())
      .filter(Boolean)
    const currentType = draft.node_type.trim()

    if (currentType && !configured.includes(currentType)) {
      return [
        ...configured.map((value) => ({
          label: value,
          value,
        })),
        {
          label: `${currentType} (unconfigured)`,
          value: `${UNCONFIGURED_TYPE_PREFIX}${currentType}`,
        },
      ]
    }

    return configured.map((value) => ({
      label: value,
      value,
    }))
  }, [configuredNodeTypes, draft.node_type])

  const pathPreview = React.useMemo(() => {
    const label = draft.label.trim()
    if (!label) return parentNode?.path || "Add a label to preview the path"
    return parentNode ? `${parentNode.path} > ${label}` : label
  }, [draft.label, parentNode])

  const modelByID = React.useMemo(
    () =>
      new Map(
        aiModels
          .filter((model) => model.status !== "inactive")
          .map((model) => [model.model_id, model])
      ),
    [aiModels]
  )
  const defaultGenerationModel = React.useMemo(
    () =>
      taxonomyProcess?.default_model_id
        ? modelByID.get(taxonomyProcess.default_model_id) ?? null
        : null,
    [modelByID, taxonomyProcess?.default_model_id]
  )
  const fallbackGenerationModel = React.useMemo(
    () =>
      taxonomyProcess?.fallback_model_id
        ? modelByID.get(taxonomyProcess.fallback_model_id) ?? null
        : null,
    [modelByID, taxonomyProcess?.fallback_model_id]
  )
  const availableGenerationModels = React.useMemo(
    () =>
      (taxonomyProcess?.available_model_ids ?? [])
        .map((modelID) => modelByID.get(modelID) ?? null)
        .filter((model): model is AIModel => Boolean(model)),
    [modelByID, taxonomyProcess?.available_model_ids]
  )
  const generationModelOptions = React.useMemo(() => {
    const values = [
      defaultGenerationModel,
      fallbackGenerationModel,
      ...availableGenerationModels,
    ]

    return Array.from(
      new Map(
        values
          .filter((model): model is AIModel => Boolean(model))
          .map((model) => [model.model_id, model])
      ).values()
    )
  }, [
    availableGenerationModels,
    defaultGenerationModel,
    fallbackGenerationModel,
  ])
  const selectedGenerationModel = React.useMemo(
    () =>
      manualGenerationModelID
        ? modelByID.get(manualGenerationModelID) ?? null
        : defaultGenerationModel,
    [defaultGenerationModel, manualGenerationModelID, modelByID]
  )
  const generationModelGroups = React.useMemo<AIGenerationOptionGroup[]>(
    () => [
      {
        key: "default",
        label: "Default model",
        options: defaultGenerationModel
          ? [
              {
                id: defaultGenerationModel.model_id,
                label: defaultGenerationModel.label,
              },
            ]
          : [],
      },
      {
        key: "fallback",
        label: "Fallback model",
        options: fallbackGenerationModel
          ? [
              {
                id: fallbackGenerationModel.model_id,
                label: fallbackGenerationModel.label,
              },
            ]
          : [],
      },
      {
        key: "available",
        label: "Available models",
        options: availableGenerationModels.map((model) => ({
          id: model.model_id,
          label: model.label,
        })),
      },
    ],
    [availableGenerationModels, defaultGenerationModel, fallbackGenerationModel]
  )
  const modelAuditEntries = React.useMemo<LLMAuditEntry[]>(
    () =>
      modelAuditHistory.map((entry) => ({
        id: entry.revision_id,
        changed_at: entry.changed_at,
        changed_by: entry.changed_by_username || entry.changed_by_user_id,
        status: entry.status,
        summary: entry.change_reason || `Updated ${entry.label}`,
      })),
    [modelAuditHistory]
  )

  React.useEffect(() => {
    const defaultModelID = defaultGenerationModel?.model_id || ""
    if (
      manualGenerationModelID &&
      generationModelOptions.some(
        (model) => model.model_id === manualGenerationModelID
      )
    ) {
      return
    }

    setManualGenerationModelID(defaultModelID)
  }, [
    defaultGenerationModel?.model_id,
    generationModelOptions,
    manualGenerationModelID,
  ])

  React.useEffect(() => {
    async function loadModelAuditHistory() {
      if (!selectedGenerationModel?.model_id) {
        setModelAuditHistory([])
        return
      }

      setModelAuditLoading(true)
      try {
        const result = await getJson<{ history?: AIModelHistoryEntry[] }>(
          `/api/link-iq/ai/models/${selectedGenerationModel.model_id}/history?limit=100`
        )
        setModelAuditHistory(result.history ?? [])
      } catch (error) {
        toast.error("Failed to load model audit history", {
          description: error instanceof Error ? error.message : "Unknown error",
        })
        setModelAuditHistory([])
      } finally {
        setModelAuditLoading(false)
      }
    }

    void loadModelAuditHistory()
  }, [selectedGenerationModel?.model_id])

  const isDirty = React.useMemo(() => {
    return (
      serializeDraft(draft) !==
      serializeDraft(buildDraft(selectedNode, sourceID))
    )
  }, [draft, selectedNode, sourceID])

  React.useEffect(() => {
    void reloadNodes(selectedNodeID !== "__new__" ? selectedNodeID : undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isEditorDockedRight = React.useCallback(() => {
    const workspaceElement = workspaceRef.current
    const editorElement = editorPanelRef.current
    if (!workspaceElement || !editorElement) return false

    const workspaceRect = workspaceElement.getBoundingClientRect()
    const editorRect = editorElement.getBoundingClientRect()
    const DOCK_TOLERANCE = 20
    const verticalOverlap =
      editorRect.bottom > workspaceRect.top &&
      editorRect.top < workspaceRect.bottom

    return (
      verticalOverlap &&
      Math.abs(editorRect.right - workspaceRect.right) <= DOCK_TOLERANCE
    )
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
        node_type: draft.node_type.trim() || undefined,
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

      const node = await postJson<TaxonomyNode>(
        "/api/link-iq/taxonomy/nodes",
        payload
      )
      toast.success(
        draft.taxonomy_node_id
          ? "Taxonomy node updated"
          : "Taxonomy node created"
      )
      await reloadNodes(node.taxonomy_node_id)
      if (!isEditorDockedRight()) {
        setEditorOpen(false)
      }
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
      await deleteJson(
        `/api/link-iq/taxonomy/nodes/${selectedNode.taxonomy_node_id}`
      )
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
    await postJson(`/api/link-iq/taxonomy/nodes/move`, {
      taxonomy_node_id: nodeID,
      parent_node_id: parentNodeID || undefined,
    })
    toast.success("Taxonomy node moved")
    await reloadNodes(nodeID)
  }

  async function handleGenerateDescription(requestedModelID?: string) {
    if (!draft.label.trim()) {
      toast.error("Add a node label before generating a description")
      return
    }

    const effectiveModelID =
      requestedModelID ||
      selectedGenerationModel?.model_id ||
      taxonomyProcess?.default_model_id ||
      ""
    const promptContext = buildTaxonomyPromptContext({
      businessContextFields,
      draft,
      parentPath: parentNode?.path || "",
      pathPreview,
      sourceID,
    })

    setGeneratingDescription(true)
    try {
      const result =
        effectiveModelID &&
        taxonomyProcess?.default_model_id &&
        effectiveModelID !== taxonomyProcess.default_model_id &&
        taxonomyProcess.prompt_template.trim()
          ? await runManualTaxonomyGeneration({
              model: modelByID.get(effectiveModelID) ?? null,
              modelID: effectiveModelID,
              process: taxonomyProcess,
              promptContext,
            })
          : await postJson<{
              provider_id?: string
              model_id?: string
              model_label?: string
              prompt?: string
              output_text?: string
              generated_at?: string
            }>("/api/link-iq/ai/generate/taxonomy-description", {
              existing_description: draft.description,
              label: draft.label,
              node_type: draft.node_type,
              parent_path: parentNode?.path || "",
              path_preview: pathPreview,
              source_id: draft.source_id || sourceID,
              source_scope: draft.source_scope,
            })

      const nextDescription = result.output_text?.trim()
      if (!nextDescription) {
        throw new Error("The configured model returned no description")
      }

      setDraft((current) => ({ ...current, description: nextDescription }))
      if (effectiveModelID) {
        setManualGenerationModelID(effectiveModelID)
      }
      appendLLMExecutionEntry({
        source:
          effectiveModelID &&
          taxonomyProcess?.default_model_id &&
          effectiveModelID !== taxonomyProcess.default_model_id
            ? "ai.model.run"
            : "ai.process.run",
        trigger: "Taxonomy description generation",
        process_key: TAXONOMY_PROCESS_KEY,
        process_label: "Taxonomy Description",
        provider_id: result.provider_id,
        model_id: result.model_id || effectiveModelID,
        model_label:
          result.model_label || modelByID.get(effectiveModelID)?.label,
        prompt: result.prompt || "",
        output_text: result.output_text || "",
        generated_at: result.generated_at,
      })
      toast.success("Description generated")
    } catch (error) {
      appendLLMExecutionEntry({
        source:
          effectiveModelID &&
          taxonomyProcess?.default_model_id &&
          effectiveModelID !== taxonomyProcess.default_model_id
            ? "ai.model.run"
            : "ai.process.run",
        trigger: "Taxonomy description generation",
        process_key: TAXONOMY_PROCESS_KEY,
        process_label: "Taxonomy Description",
        prompt: "",
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate taxonomy description",
      })
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
    <div className="flex min-h-0 flex-1">
      <div
        ref={workspaceRef}
        className="relative min-h-0 flex-1 overflow-hidden border border-border/60 bg-background/20 shadow-[0_20px_60px_-24px_hsl(var(--foreground)/0.35)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/10"
      >
        <div className="absolute inset-0">
          <TaxonomyFlowSurface
            nodes={nodes}
            search={search}
            selectedNodeID={selectedNodeID}
            onMoveNode={handleMoveNode}
            onSelectNode={handleSelectNode}
            layoutInsetLeft={24}
            layoutInsetTop={116}
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-4">
          <div className="pointer-events-auto flex w-full max-w-4xl items-center gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <Input
              placeholder="Search taxonomy path, label, type, or description"
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
            ref={editorPanelRef}
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
                  <div className="flex items-center gap-2">
                    {selectedNode.node_type ? (
                      <Badge variant="secondary">
                        {selectedNode.node_type}
                      </Badge>
                    ) : null}
                    <Badge variant="outline">
                      {selectedNode.taxonomy_node_id}
                    </Badge>
                  </div>
                ) : (
                  <Badge variant="secondary">New node</Badge>
                )
              }
            >
              <DialogTitle>
                <span className="ui-card-title block">
                  {selectedNode ? "Edit Taxonomy Node" : "Create Taxonomy Node"}
                </span>
              </DialogTitle>
              <DialogDescription>
                <span className="ui-help-text block">
                  Define the hierarchy path, scoping, classification, and
                  projection state for Link.
                </span>
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-5">
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_14rem]">
                <div className="grid gap-2">
                  <Label htmlFor="taxonomy-label" className="ui-field-label">Label</Label>
                  <Input
                    id="taxonomy-label"
                    value={draft.label}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
                    placeholder="Invoice > Utilities"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="taxonomy-node-type">Type</Label>
                  <Select
                    value={
                      draft.node_type.trim()
                        ? typeOptions.some(
                            (option) => option.value === draft.node_type.trim()
                          )
                          ? draft.node_type.trim()
                          : `${UNCONFIGURED_TYPE_PREFIX}${draft.node_type.trim()}`
                        : NO_TYPE_VALUE
                    }
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        node_type:
                          value === NO_TYPE_VALUE
                            ? ""
                            : value.startsWith(UNCONFIGURED_TYPE_PREFIX)
                              ? value.slice(UNCONFIGURED_TYPE_PREFIX.length)
                              : value,
                      }))
                    }
                  >
                    <SelectTrigger id="taxonomy-node-type" className="w-full">
                      <SelectValue placeholder="No type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_TYPE_VALUE}>No type</SelectItem>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                    <SelectItem value={ROOT_PARENT_VALUE}>
                      No parent (root)
                    </SelectItem>
                    {availableParents.map((node) => (
                      <SelectItem
                        key={node.taxonomy_node_id}
                        value={node.taxonomy_node_id}
                      >
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
                    <SelectTrigger
                      id="taxonomy-mapping-state"
                      className="w-full"
                    >
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
                  value={
                    draft.source_scope === "link_global" ? "" : draft.source_id
                  }
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
                  <AIGenerationButton
                    actionLabel="Generate with AI"
                    actionIcon={<Sparkles className="size-4" />}
                    disabled={!draft.label.trim()}
                    historyDisabled={
                      executionEntries.length === 0 &&
                      modelAuditEntries.length === 0 &&
                      !selectedGenerationModel
                    }
                    loading={generatingDescription}
                    modelGroups={generationModelGroups}
                    selectedModelID={selectedGenerationModel?.model_id}
                    selectedModelLabel={
                      selectedGenerationModel?.label || "Select model"
                    }
                    onAction={() =>
                      void handleGenerateDescription(selectedGenerationModel?.model_id)
                    }
                    onOpenHistory={() => setHistoryOpen(true)}
                    onSelectModel={setManualGenerationModelID}
                  />
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
                <div className="ui-card-title flex items-center gap-2 text-sm">
                  <GitBranch className="size-4" />
                  Path Preview
                </div>
                <div className="ui-help-text mt-2 text-foreground">
                  {pathPreview}
                </div>
                <div className="ui-caption mt-1">
                  {draft.node_type.trim()
                    ? `Type ${draft.node_type.trim()}, `
                    : ""}
                  Depth {parentNode ? parentNode.depth + 1 : 0}
                  {draft.source_scope !== "link_global"
                    ? `, source ${draft.source_id.trim() || sourceID}`
                    : ", global scope"}
                </div>
              </div>
            </DialogBody>

            <DialogFooter className="items-end justify-between gap-4 border-t pt-4">
              <div className="ui-help-text max-w-md">
                Root nodes create top-level contexts. Child nodes derive their
                path and depth from the selected parent.
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
        <LLMActivityDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          title="LLM activity"
          description="Review taxonomy description executions and the audit trail for the currently selected generation model."
          executionEntries={executionEntries}
          auditEntries={modelAuditEntries}
          auditLoading={modelAuditLoading}
          auditTargetLabel={selectedGenerationModel?.label}
          executionEmptyMessage="No taxonomy description executions have been recorded yet."
        />
      </div>
    </div>
  )
}

function buildTaxonomyPromptContext({
  businessContextFields,
  draft,
  parentPath,
  pathPreview,
  sourceID,
}: {
  businessContextFields: ContextField[]
  draft: TaxonomyNodeDraft
  parentPath: string
  pathPreview: string
  sourceID: string
}): TaxonomyPromptContext {
  return {
    label: draft.label,
    node_type: draft.node_type,
    parent_path: parentPath,
    path_preview: pathPreview,
    source_id: draft.source_id || sourceID,
    source_scope: draft.source_scope,
    existing_description: draft.description,
    business_context: Object.fromEntries(
      businessContextFields.map((field) => [
        field.key,
        field.value ||
          field.sample_values?.[0] ||
          field.acceptable_values?.[0] ||
          field.label ||
          "",
      ])
    ),
  }
}

async function runManualTaxonomyGeneration({
  model,
  modelID,
  process,
  promptContext,
}: {
  model: AIModel | null
  modelID: string
  process: AIProcessConfig
  promptContext: TaxonomyPromptContext
}) {
  const prompt = renderTaxonomyPromptTemplate(
    process.prompt_template,
    promptContext
  )
  const result = await postJson<{
    provider_id?: string
    model_id?: string
    model_label?: string
    prompt?: string
    output_text?: string
    generated_at?: string
  }>(`/api/link-iq/ai/models/${modelID}/run`, {
    prompt,
  })

  return {
    ...result,
    provider_id: result.provider_id || model?.provider_id,
    model_id: result.model_id || modelID,
    model_label: result.model_label || model?.label,
    prompt: result.prompt || prompt,
  }
}

function renderTaxonomyPromptTemplate(
  template: string,
  context: TaxonomyPromptContext
) {
  let output = template
  const ifPattern =
    /{{\s*if\s+(.+?)\s*}}([\s\S]*?)(?:{{\s*else\s*}}([\s\S]*?))?{{\s*end\s*}}/g

  let previous = ""
  while (output !== previous) {
    previous = output
    output = output.replace(
      ifPattern,
      (_, condition: string, truthyBlock: string, falsyBlock?: string) => {
        return resolveTaxonomyTemplateValue(condition, context)
          ? truthyBlock
          : (falsyBlock ?? "")
      }
    )
  }

  output = output.replace(
    /{{\s*with\s+\.business_context\s*}}\s*{{\s*index\s+\.\s+"([^"]+)"\s*}}\s*{{\s*end\s*}}/g,
    (_, key: string) => context.business_context[key] ?? ""
  )

  output = output.replace(
    /{{\s*index\s+\.business_context\s+"([^"]+)"\s*}}/g,
    (_, key: string) => context.business_context[key] ?? ""
  )

  output = output.replace(
    /{{\s*(\.[A-Za-z_][\w.]*)\s*}}/g,
    (_, reference: string) => {
      const value = resolveTaxonomyTemplateValue(reference, context)
      return typeof value === "string" ? value : ""
    }
  )

  output = output.replace(/{{[^}]+}}/g, "")
  output = output.replace(/\n{3,}/g, "\n\n")
  return output.trim()
}

function resolveTaxonomyTemplateValue(
  reference: string,
  context: TaxonomyPromptContext
) {
  const trimmed = reference.trim()
  if (trimmed.startsWith("index .business_context")) {
    const match = trimmed.match(/index\s+\.business_context\s+"([^"]+)"/)
    if (!match) return ""
    return context.business_context[match[1]] ?? ""
  }

  if (!trimmed.startsWith(".")) return ""

  const key = trimmed.slice(1)
  if (key in context) {
    const value = context[key as keyof TaxonomyPromptContext]
    return typeof value === "string" ? value : ""
  }

  return ""
}
