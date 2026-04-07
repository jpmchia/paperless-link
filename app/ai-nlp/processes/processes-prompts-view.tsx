"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { IDisposable, editor as MonacoEditor } from "monaco-editor"
import { toast } from "sonner"
import {
  LLMActivityDialog,
  type LLMAuditEntry,
} from "@/components/ai/llm-activity-dialog"
import {
  buildBusinessContextToken,
  normalizeAIProcessAllocation,
} from "@/lib/ai-processes"
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { appendLLMExecutionEntry, useLLMExecutionEntries } from "@/lib/llm-activity"
import { getJson, postJson } from "@/lib/paperless-client"
import type {
  AIModel,
  AIModelHistoryEntry,
  AIProcessConfig,
  AIProvider,
  ContextField,
} from "@/lib/link-iq-types"
import { ModelAllocationCard } from "./components/model-allocation-card"
import { PromptTemplateConfigurationCard } from "./components/prompt-template-configuration-card"
import { ProviderModelComparisonCard } from "./components/provider-model-comparison-card"
import type {
  ComparisonSlotState,
  PromptExampleContext,
  PromptFieldDescriptor,
  PromptFieldReferenceDescriptor,
} from "./components/types"

type Props = {
  initialModels: AIModel[]
  initialProcesses: AIProcessConfig[]
  initialProviders: AIProvider[]
  embedded?: boolean
}

const BUSINESS_CONTEXT_SECTION = "business_context"
const DEFAULT_RETAIN_HISTORY = true
const DEFAULT_INCLUDE_HISTORY = true
const DEFAULT_HISTORY_TEXT_LENGTH = 4000

function normalizeTaxonomyProcess(process: AIProcessConfig): AIProcessConfig {
  const normalizedAllocation = normalizeAIProcessAllocation(process)
  const retainHistory = process.retain_history ?? DEFAULT_RETAIN_HISTORY
  const includeHistory =
    retainHistory && (process.include_history ?? DEFAULT_INCLUDE_HISTORY)
  const historyTextLength =
    typeof process.history_text_length === "number" &&
    Number.isFinite(process.history_text_length) &&
    process.history_text_length > 0
      ? Math.round(process.history_text_length)
      : DEFAULT_HISTORY_TEXT_LENGTH

  return {
    ...normalizedAllocation,
    retain_history: retainHistory,
    include_history: includeHistory,
    history_text_length: historyTextLength,
  }
}

function defaultTaxonomyProcess(): AIProcessConfig {
  return normalizeTaxonomyProcess({
    process_key: "taxonomy.description",
    section: "taxonomy",
    label: "Taxonomy Description",
    description:
      "Generate concise taxonomy node descriptions from node context.",
    provider_id: "",
    model_id: "",
    prompt_template:
      "Write a concise, business-friendly description for a taxonomy node in a document intelligence system.\n\nNode label: {{ .label }}\n{{ if .node_type }}Node type: {{ .node_type }}\n{{ end }}{{ if .parent_path }}Parent path: {{ .parent_path }}\n{{ end }}{{ if .path_preview }}Full path: {{ .path_preview }}\n{{ end }}Source scope: {{ .source_scope }}\n{{ if .source_id }}Source identifier: {{ .source_id }}\n{{ end }}{{ if .existing_description }}Existing description: {{ .existing_description }}\n{{ end }}\nReturn only the description text in 1-2 sentences, with no bullets or prefixes.",
    output_format: "text",
    status: "active",
  })
}

function createEmptyComparisonSlots(
  process: AIProcessConfig,
  models: AIModel[]
): ComparisonSlotState[] {
  const firstModelID = process.default_model_id || process.model_id || ""
  const firstMatchingModel = firstModelID
    ? models.find((model) => model.model_id === firstModelID) ?? null
    : null

  return [
    {
      id: "comparison-1",
      providerID: firstMatchingModel?.provider_id || process.provider_id || "",
      modelID: firstMatchingModel?.model_id || "",
      running: false,
      result: null,
      error: "",
    },
    {
      id: "comparison-2",
      providerID: "",
      modelID: "",
      running: false,
      result: null,
      error: "",
    },
    {
      id: "comparison-3",
      providerID: "",
      modelID: "",
      running: false,
      result: null,
      error: "",
    },
  ]
}

export function ProcessesPromptsView({
  initialModels,
  initialProcesses,
  initialProviders,
  embedded = false,
}: Props) {
  const initialProcess = normalizeTaxonomyProcess(
    initialProcesses.find(
      (process) => process.process_key === "taxonomy.description"
    ) ?? defaultTaxonomyProcess()
  )

  const [providers, setProviders] = React.useState(initialProviders)
  const [models, setModels] = React.useState(initialModels)
  const [businessContextFields, setBusinessContextFields] = React.useState<
    ContextField[]
  >([])
  const [taxonomyProcessDraft, setTaxonomyProcessDraft] =
    React.useState<AIProcessConfig>(initialProcess)
  const [comparisonSlots, setComparisonSlots] = React.useState<
    ComparisonSlotState[]
  >(() => createEmptyComparisonSlots(initialProcess, initialModels))
  const [loading, setLoading] = React.useState(false)
  const [savingProcess, setSavingProcess] = React.useState(false)
  const [processActivityOpen, setProcessActivityOpen] = React.useState(false)
  const [processAuditLoading, setProcessAuditLoading] = React.useState(false)
  const [processAuditHistory, setProcessAuditHistory] = React.useState<
    AIModelHistoryEntry[]
  >([])
  const [selectedFieldID, setSelectedFieldID] =
    React.useState<string>("process:label")
  const [renderFieldPillsInEditor, setRenderFieldPillsInEditor] =
    React.useState(true)
  const [carouselApi, setCarouselApi] = React.useState<CarouselApi>()
  const [manualSelectionModelID, setManualSelectionModelID] = React.useState(
    initialProcess.default_model_id || initialProcess.model_id || ""
  )
  const promptEditorRef =
    React.useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const selectionListenerRef = React.useRef<IDisposable | null>(null)
  const decorationIDsRef = React.useRef<string[]>([])
  const lastSelectionRef = React.useRef<{ start: number; end: number }>({
    start: 0,
    end: 0,
  })

  const processFields = React.useMemo<PromptFieldDescriptor[]>(
    () => [
      {
        id: "process:label",
        label: "Node Label",
        token: "{{ .label }}",
        description: "The taxonomy node label currently being described.",
        sampleValues: ["Company", "Supplier Invoice", "Statutory Filings"],
        source: "process",
      },
      {
        id: "process:node_type",
        label: "Node Type",
        token: "{{ .node_type }}",
        description:
          "An optional free-text type that classifies the taxonomy node.",
        sampleValues: ["Business Area", "Department", "Document Type"],
        source: "process",
      },
      {
        id: "process:parent_path",
        label: "Parent Path",
        token: "{{ .parent_path }}",
        description:
          "The parent branch path for the taxonomy node, if one exists.",
        sampleValues: ["CoSec > Company", "Finance > Accounts Payable"],
        source: "process",
      },
      {
        id: "process:path_preview",
        label: "Path Preview",
        token: "{{ .path_preview }}",
        description: "The proposed full taxonomy path for the current node.",
        sampleValues: ["CoSec > Company > Incorporation"],
        source: "process",
      },
      {
        id: "process:source_scope",
        label: "Source Scope",
        token: "{{ .source_scope }}",
        description: "The source scope being applied to the taxonomy node.",
        sampleValues: ["global", "instance"],
        source: "process",
      },
      {
        id: "process:source_id",
        label: "Source Identifier",
        token: "{{ .source_id }}",
        description:
          "The source identifier for instance-scoped nodes when available.",
        sampleValues: ["example-ngx"],
        source: "process",
      },
      {
        id: "process:existing_description",
        label: "Existing Description",
        token: "{{ .existing_description }}",
        description:
          "The current saved description for the node, if one already exists.",
        sampleValues: ["Documents relating to company incorporation filings."],
        source: "process",
      },
    ],
    []
  )

  const businessFieldDescriptors = React.useMemo<PromptFieldDescriptor[]>(
    () =>
      businessContextFields.map((field) => ({
        id: `business:${field.field_id}`,
        label: field.label,
        token: buildBusinessContextToken(field.key),
        description: field.description,
        sampleValues: field.sample_values,
        acceptableValues: field.acceptable_values,
        currentValue: field.value,
        dataType: field.data_type,
        source: "business",
      })),
    [businessContextFields]
  )

  const allFields = React.useMemo(
    () => [...processFields, ...businessFieldDescriptors],
    [processFields, businessFieldDescriptors]
  )

  const referenceDescriptors = React.useMemo<
    Map<string, PromptFieldReferenceDescriptor>
  >(() => {
    const map = new Map<string, PromptFieldReferenceDescriptor>()

    for (const field of allFields) {
      for (const reference of extractDotReferences(field.token)) {
        if (!map.has(reference)) {
          map.set(reference, {
            reference,
            label:
              reference === ".business_context"
                ? "Business context"
                : field.label,
            description:
              reference === ".business_context"
                ? "Business context map used to resolve instance and system business definitions."
                : field.description,
            source: field.source,
          })
        }
      }
    }

    return map
  }, [allFields])

  const exampleContext = React.useMemo<PromptExampleContext>(() => {
    const businessContext = Object.fromEntries(
      businessContextFields.map((field) => [
        field.key,
        field.value ||
          field.sample_values?.[0] ||
          field.acceptable_values?.[0] ||
          field.label,
      ])
    )

    return {
      label:
        processFields.find((field) => field.id === "process:label")
          ?.sampleValues?.[0] || "Company",
      node_type:
        processFields.find((field) => field.id === "process:node_type")
          ?.sampleValues?.[0] || "Business Area",
      parent_path:
        processFields.find((field) => field.id === "process:parent_path")
          ?.sampleValues?.[0] || "",
      path_preview:
        processFields.find((field) => field.id === "process:path_preview")
          ?.sampleValues?.[0] || "",
      source_scope:
        processFields.find((field) => field.id === "process:source_scope")
          ?.sampleValues?.[0] || "global",
      source_id:
        processFields.find((field) => field.id === "process:source_id")
          ?.sampleValues?.[0] || "",
      existing_description:
        processFields.find(
          (field) => field.id === "process:existing_description"
        )?.sampleValues?.[0] || "",
      business_context: businessContext,
    }
  }, [businessContextFields, processFields])

  const renderedPrompt = React.useMemo(
    () =>
      renderPromptTemplate(
        taxonomyProcessDraft.prompt_template,
        exampleContext
      ),
    [exampleContext, taxonomyProcessDraft.prompt_template]
  )
  const processExecutionEntries = useLLMExecutionEntries({
    process_key: "taxonomy.description",
  })
  const processAuditEntries = React.useMemo<LLMAuditEntry[]>(
    () =>
      processAuditHistory.map((entry) => ({
        id: entry.revision_id,
        changed_at: entry.changed_at,
        changed_by: entry.changed_by_username || entry.changed_by_user_id,
        status: entry.status,
        summary: entry.change_reason || `Updated ${entry.label}`,
      })),
    [processAuditHistory]
  )
  const defaultAllocatedModel = React.useMemo(
    () =>
      models.find(
        (model) => model.model_id === taxonomyProcessDraft.default_model_id
      ) ?? null,
    [models, taxonomyProcessDraft.default_model_id]
  )
  const manualSelectableModelIDs = React.useMemo(() => {
    const values = [
      taxonomyProcessDraft.default_model_id,
      taxonomyProcessDraft.fallback_model_id,
      ...(taxonomyProcessDraft.available_model_ids ?? []),
    ]

    return Array.from(new Set(values.filter(Boolean))) as string[]
  }, [
    taxonomyProcessDraft.available_model_ids,
    taxonomyProcessDraft.default_model_id,
    taxonomyProcessDraft.fallback_model_id,
  ])

  async function reloadAll() {
    setLoading(true)
    try {
      const [
        providersResponse,
        modelsResponse,
        processesResponse,
        businessContextResponse,
      ] = await Promise.all([
        getJson<{ providers?: AIProvider[] }>("/api/link-iq/ai/providers"),
        getJson<{ models?: AIModel[] }>("/api/link-iq/ai/models"),
        getJson<{ processes?: AIProcessConfig[] }>("/api/link-iq/ai/processes"),
        getJson<{ fields?: ContextField[] }>(
          `/api/link-iq/context-fields?section=${BUSINESS_CONTEXT_SECTION}`
        ),
      ])

      const nextProviders = providersResponse.providers ?? []
      const nextModels = modelsResponse.models ?? []
      const nextProcesses = processesResponse.processes ?? []
      const nextBusinessContextFields = businessContextResponse.fields ?? []
      const nextProcess = normalizeTaxonomyProcess(
        nextProcesses.find(
          (process) => process.process_key === "taxonomy.description"
        ) ?? defaultTaxonomyProcess()
      )

      setProviders(nextProviders)
      setModels(nextModels)
      setBusinessContextFields(nextBusinessContextFields)
      setTaxonomyProcessDraft(nextProcess)
      setComparisonSlots((current) =>
        current.some(
          (slot) => slot.providerID || slot.modelID || slot.result || slot.error
        )
          ? current
          : createEmptyComparisonSlots(nextProcess, nextModels)
      )
    } catch (error) {
      toast.error("Failed to reload AI processes", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (
      !allFields.some((field) => field.id === selectedFieldID) &&
      allFields[0]
    ) {
      setSelectedFieldID(allFields[0].id)
    }
  }, [allFields, selectedFieldID])

  React.useEffect(() => {
    if (
      manualSelectionModelID &&
      manualSelectableModelIDs.includes(manualSelectionModelID)
    ) {
      return
    }

    setManualSelectionModelID(manualSelectableModelIDs[0] || "")
  }, [manualSelectableModelIDs, manualSelectionModelID])

  React.useEffect(() => {
    void reloadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    async function loadProcessAuditHistory() {
      if (!taxonomyProcessDraft.default_model_id) {
        setProcessAuditHistory([])
        return
      }

      setProcessAuditLoading(true)
      try {
        const result = await getJson<{ history?: AIModelHistoryEntry[] }>(
          `/api/link-iq/ai/models/${taxonomyProcessDraft.default_model_id}/history?limit=100`
        )
        setProcessAuditHistory(result.history ?? [])
      } catch (error) {
        toast.error("Failed to load process audit history", {
          description: error instanceof Error ? error.message : "Unknown error",
        })
        setProcessAuditHistory([])
      } finally {
        setProcessAuditLoading(false)
      }
    }

    void loadProcessAuditHistory()
  }, [taxonomyProcessDraft.default_model_id])

  React.useEffect(() => {
    return () => {
      selectionListenerRef.current?.dispose()
      const editor = promptEditorRef.current
      if (editor && decorationIDsRef.current.length > 0) {
        decorationIDsRef.current = editor.deltaDecorations(
          decorationIDsRef.current,
          []
        )
      }
    }
  }, [])

  const applyFieldDecorations = React.useCallback(() => {
    const editor = promptEditorRef.current
    const model = editor?.getModel()
    if (!editor || !model) return

    if (!renderFieldPillsInEditor) {
      decorationIDsRef.current = editor.deltaDecorations(
        decorationIDsRef.current,
        []
      )
      return
    }

    const text = model.getValue()
    const decorations: MonacoEditor.IModelDeltaDecoration[] = []
    const actionPattern = /{{[\s\S]*?}}/g
    const referencePattern = /\.[A-Za-z_][\w.]*/g

    for (const actionMatch of text.matchAll(actionPattern)) {
      const actionText = actionMatch[0]
      const actionStart = actionMatch.index ?? 0

      for (const referenceMatch of actionText.matchAll(referencePattern)) {
        const reference = referenceMatch[0]
        const descriptor = referenceDescriptors.get(reference)
        if (!descriptor) continue

        const referenceStart = actionStart + (referenceMatch.index ?? 0)
        const referenceEnd = referenceStart + reference.length

        decorations.push({
          range: {
            startLineNumber: model.getPositionAt(referenceStart).lineNumber,
            startColumn: model.getPositionAt(referenceStart).column,
            endLineNumber: model.getPositionAt(referenceEnd).lineNumber,
            endColumn: model.getPositionAt(referenceEnd).column,
          },
          options: {
            inlineClassName: "linkiq-monaco-token-reference-hidden",
            inlineClassNameAffectsLetterSpacing: false,
            after: {
              content: descriptor.label,
              inlineClassName: [
                "linkiq-monaco-token-chip",
                descriptor.source === "business"
                  ? "linkiq-monaco-token-chip-business"
                  : "linkiq-monaco-token-chip-process",
              ].join(" "),
              inlineClassNameAffectsLetterSpacing: true,
              cursorStops: 3,
            },
            hoverMessage: {
              value: `**${descriptor.label}**\n\n${descriptor.description || descriptor.reference}`,
            },
          },
        })
      }
    }

    decorationIDsRef.current = editor.deltaDecorations(
      decorationIDsRef.current,
      decorations
    )
  }, [referenceDescriptors, renderFieldPillsInEditor])

  React.useEffect(() => {
    applyFieldDecorations()
  }, [applyFieldDecorations, taxonomyProcessDraft.prompt_template])

  function rememberSelectionFromEditor() {
    const editor = promptEditorRef.current
    if (!editor) return
    const selection = editor.getSelection()
    const model = editor.getModel()
    if (!selection || !model) return
    lastSelectionRef.current = {
      start: model.getOffsetAt(selection.getStartPosition()),
      end: model.getOffsetAt(selection.getEndPosition()),
    }
  }

  function insertPromptToken(token: string, explicitPosition?: number) {
    setTaxonomyProcessDraft((current) => {
      const text = current.prompt_template || ""
      const editor = promptEditorRef.current
      const model = editor?.getModel()
      const selection = editor?.getSelection()
      const start =
        explicitPosition ??
        (selection && model
          ? model.getOffsetAt(selection.getStartPosition())
          : undefined) ??
        lastSelectionRef.current.start ??
        text.length
      const end =
        explicitPosition ??
        (selection && model
          ? model.getOffsetAt(selection.getEndPosition())
          : undefined) ??
        lastSelectionRef.current.end ??
        start
      const nextText = `${text.slice(0, start)}${token}${text.slice(end)}`
      const nextCursor = start + token.length

      requestAnimationFrame(() => {
        const nextEditor = promptEditorRef.current
        const nextModel = nextEditor?.getModel()
        if (!nextEditor || !nextModel) return
        const nextPosition = nextModel.getPositionAt(nextCursor)
        nextEditor.focus()
        nextEditor.setPosition(nextPosition)
        nextEditor.setSelection({
          startLineNumber: nextPosition.lineNumber,
          startColumn: nextPosition.column,
          endLineNumber: nextPosition.lineNumber,
          endColumn: nextPosition.column,
        })
        lastSelectionRef.current = { start: nextCursor, end: nextCursor }
      })

      return {
        ...current,
        prompt_template: nextText,
      }
    })
  }

  async function handleSaveProcess() {
    setSavingProcess(true)
    try {
      await postJson<AIProcessConfig>(
        "/api/link-iq/ai/processes",
        normalizeTaxonomyProcess(taxonomyProcessDraft)
      )
      toast.success("Taxonomy process updated")
      await reloadAll()
    } catch (error) {
      toast.error("Failed to save taxonomy process", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSavingProcess(false)
    }
  }

  async function handleRunComparison(slotID: string) {
    const slot = comparisonSlots.find((entry) => entry.id === slotID)
    if (!slot?.modelID) return
    const selectedModel =
      models.find((model) => model.model_id === slot.modelID) ?? null
    const selectedProvider =
      providers.find(
        (provider) =>
          provider.provider_id === (selectedModel?.provider_id || slot.providerID)
      ) ?? null

    setComparisonSlots((current) =>
      current.map((entry) =>
        entry.id === slotID ? { ...entry, running: true, error: "" } : entry
      )
    )

    try {
      const result = await postJson<{
        model_label?: string
        output_text?: string
        prompt?: string
        generated_at?: string
      }>(`/api/link-iq/ai/models/${slot.modelID}/run`, {
        prompt: renderedPrompt,
      })

      setComparisonSlots((current) =>
        current.map((entry) =>
          entry.id === slotID
            ? {
                ...entry,
                running: false,
                result: {
                  provider_id: entry.providerID,
                  model_id: entry.modelID,
                  prompt: result.prompt || renderedPrompt,
                  output_text: result.output_text || "",
                  generated_at: result.generated_at,
                },
                error: "",
              }
            : entry
        )
      )
      appendLLMExecutionEntry({
        source: "ai.model.run",
        trigger: "Process comparison",
        process_key: taxonomyProcessDraft.process_key,
        process_label: taxonomyProcessDraft.label,
        provider_id: selectedModel?.provider_id || slot.providerID,
        provider_label: selectedProvider?.label,
        model_id: slot.modelID,
        model_label: result.model_label || selectedModel?.label,
        prompt: result.prompt || renderedPrompt,
        output_text: result.output_text || "",
        generated_at: result.generated_at,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to run comparison"
      setComparisonSlots((current) =>
        current.map((entry) =>
          entry.id === slotID
            ? {
                ...entry,
                running: false,
                error: message,
              }
            : entry
        )
      )
      appendLLMExecutionEntry({
        source: "ai.model.run",
        trigger: "Process comparison",
        process_key: taxonomyProcessDraft.process_key,
        process_label: taxonomyProcessDraft.label,
        provider_id: selectedModel?.provider_id || slot.providerID,
        provider_label: selectedProvider?.label,
        model_id: slot.modelID,
        model_label: selectedModel?.label,
        prompt: renderedPrompt,
        error: message,
      })
      toast.error("Failed to run comparison", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const content = (
    <div
      className={
        embedded
          ? "flex h-full min-h-0 flex-1 overflow-hidden"
          : "flex h-full min-h-0 flex-1 overflow-hidden px-4 py-4"
      }
    >
      <Carousel
        setApi={setCarouselApi}
        opts={{ align: "start", watchDrag: false }}
        className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      >
        <CarouselContent className="ml-0 h-full">
          <CarouselItem className="flex h-full min-h-0 basis-full flex-col pr-0 pl-0">
            <PromptTemplateConfigurationCard
              promptDraft={taxonomyProcessDraft}
              businessFields={businessFieldDescriptors}
              processFields={processFields}
              renderedPrompt={renderedPrompt}
              selectedFieldID={selectedFieldID}
              onSelectField={setSelectedFieldID}
              onChangePromptTemplate={(value) =>
                setTaxonomyProcessDraft((current) => ({
                  ...current,
                  prompt_template: value,
                }))
              }
              onChangeRetainHistory={(value) =>
                setTaxonomyProcessDraft((current) => ({
                  ...current,
                  retain_history: value,
                  include_history: value
                    ? (current.include_history ?? DEFAULT_INCLUDE_HISTORY)
                    : false,
                }))
              }
              onChangeIncludeHistory={(value) =>
                setTaxonomyProcessDraft((current) => ({
                  ...current,
                  include_history: value,
                }))
              }
              onChangeHistoryTextLength={(value) =>
                setTaxonomyProcessDraft((current) => ({
                  ...current,
                  history_text_length: value ?? DEFAULT_HISTORY_TEXT_LENGTH,
                }))
              }
              onInsertField={insertPromptToken}
              onReload={() => void reloadAll()}
              onSave={() => void handleSaveProcess()}
              loading={loading}
              saving={savingProcess}
              renderFieldPillsInEditor={renderFieldPillsInEditor}
              onChangeRenderFieldPillsInEditor={setRenderFieldPillsInEditor}
              referenceDescriptors={referenceDescriptors}
              promptEditorRef={promptEditorRef}
              selectionListenerRef={selectionListenerRef}
              decorationIDsRef={decorationIDsRef}
              rememberSelectionFromEditor={rememberSelectionFromEditor}
              applyFieldDecorations={applyFieldDecorations}
            />
          </CarouselItem>

          <CarouselItem className="flex h-full min-h-0 basis-full flex-col px-0">
            <ProviderModelComparisonCard
              promptTemplate={taxonomyProcessDraft.prompt_template}
              renderedPrompt={renderedPrompt}
              providers={providers}
              models={models}
              comparisonSlots={comparisonSlots}
              onChangeComparisonProvider={(slotID, providerID) => {
                setComparisonSlots((current) =>
                  current.map((slot) =>
                    slot.id === slotID
                      ? {
                          ...slot,
                          providerID,
                          modelID: "",
                          result: null,
                          error: "",
                        }
                      : slot
                  )
                )
              }}
              onChangeComparisonModel={(slotID, modelID) => {
                setComparisonSlots((current) =>
                  current.map((slot) =>
                    slot.id === slotID
                      ? { ...slot, modelID, result: null, error: "" }
                      : slot
                  )
                )
              }}
              onRunComparison={(slotID) => void handleRunComparison(slotID)}
            />
          </CarouselItem>

          <CarouselItem className="flex h-full min-h-0 basis-full flex-col pr-0 pl-0">
            <ModelAllocationCard
              promptDraft={taxonomyProcessDraft}
              models={models}
              providers={providers}
              manualSelectionModelID={manualSelectionModelID}
              activityDisabled={
                processExecutionEntries.length === 0 &&
                processAuditEntries.length === 0 &&
                !taxonomyProcessDraft.default_model_id
              }
              onChangeAvailableModel={(modelID, enabled) =>
                setTaxonomyProcessDraft((current) =>
                  normalizeTaxonomyProcess({
                    ...current,
                    available_model_ids: enabled
                      ? [...(current.available_model_ids ?? []), modelID]
                      : (current.available_model_ids ?? []).filter(
                          (value) => value !== modelID
                        ),
                  })
                )
              }
              onChangeDefaultModel={(modelID) => {
                const nextModel =
                  models.find((model) => model.model_id === modelID) ?? null
                setTaxonomyProcessDraft((current) =>
                  normalizeTaxonomyProcess({
                    ...current,
                    provider_id: nextModel?.provider_id || "",
                    default_model_id: modelID,
                    model_id: modelID,
                    fallback_model_id:
                      current.fallback_model_id === modelID
                        ? ""
                        : current.fallback_model_id,
                    available_model_ids: (current.available_model_ids ?? []).filter(
                      (value) => value !== modelID
                    ),
                  })
                )
              }}
              onChangeFallbackModel={(modelID) =>
                setTaxonomyProcessDraft((current) =>
                  normalizeTaxonomyProcess({
                    ...current,
                    fallback_model_id: modelID,
                    available_model_ids: (current.available_model_ids ?? []).filter(
                      (value) => value !== modelID
                    ),
                  })
                )
              }
              onChangeManualSelectionModel={setManualSelectionModelID}
              onOpenActivity={() => setProcessActivityOpen(true)}
              onSave={() => void handleSaveProcess()}
              saving={savingProcess}
            />
          </CarouselItem>
        </CarouselContent>

        <CarouselPrevious
          className="absolute top-1/2 left-4 z-20 h-16 w-16 -translate-y-1/2 rounded-full border-white/15 bg-background/55 text-foreground shadow-2xl backdrop-blur-md hover:bg-background/70"
          variant="ghost"
        >
          <ChevronLeft className="size-8" />
        </CarouselPrevious>
        <CarouselNext
          className="absolute top-1/2 right-4 z-20 h-16 w-16 -translate-y-1/2 rounded-full border-white/15 bg-background/55 text-foreground shadow-2xl backdrop-blur-md hover:bg-background/70"
          variant="ghost"
        >
          <ChevronRight className="size-8" />
        </CarouselNext>
      </Carousel>
      <LLMActivityDialog
        open={processActivityOpen}
        onOpenChange={setProcessActivityOpen}
        title="LLM activity"
        description="Review taxonomy process executions and the audit trail of the currently allocated default model."
        executionEntries={processExecutionEntries}
        auditEntries={processAuditEntries}
        auditLoading={processAuditLoading}
        auditTargetLabel={defaultAllocatedModel?.label}
        executionEmptyMessage="No executions have been recorded for this process yet."
      />
    </div>
  )

  return content
}

function extractDotReferences(token: string) {
  return Array.from(token.matchAll(/\.[A-Za-z_][\w.]*/g), (match) => match[0])
}

function renderPromptTemplate(template: string, context: PromptExampleContext) {
  let output = template
  const ifPattern =
    /{{\s*if\s+(.+?)\s*}}([\s\S]*?)(?:{{\s*else\s*}}([\s\S]*?))?{{\s*end\s*}}/g

  let previous = ""
  while (output !== previous) {
    previous = output
    output = output.replace(
      ifPattern,
      (_, condition: string, truthyBlock: string, falsyBlock?: string) => {
        return resolveTemplateValue(condition, context)
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
      const value = resolveTemplateValue(reference, context)
      return typeof value === "string" ? value : ""
    }
  )

  output = output.replace(/{{[^}]+}}/g, "")
  output = output.replace(/\n{3,}/g, "\n\n")
  return output.trim()
}

function resolveTemplateValue(
  reference: string,
  context: PromptExampleContext
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
    const value = context[key as keyof PromptExampleContext]
    return typeof value === "string" ? value : ""
  }

  return ""
}
