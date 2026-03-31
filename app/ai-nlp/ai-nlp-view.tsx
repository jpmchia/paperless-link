"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { toast } from "sonner"
import { type AuditHistoryColumn } from "@/components/audit-history-table"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { deleteJson, getJson, postJson } from "@/lib/paperless-client"
import type {
  AIModel,
  AIModelRunResult,
  AIModelHistoryEntry,
  AIProvider,
  AIProviderModelCatalogEntry,
} from "@/lib/link-iq-types"
import { AvailableModelsCard } from "./components/available-models-card"
import { type ModelSortColumn } from "./components/model-catalog-table-section"
import { ModelParametersCard } from "./components/model-parameters-card"
import { ModelTestCard } from "./components/model-test-card"
import { ModelUsageCard } from "./components/model-usage-card"
import { ProviderFormCard } from "./components/provider-form-card"
import { ProviderModelTree } from "./components/provider-model-tree"

type Props = {
  initialModels: AIModel[]
  initialProviders: AIProvider[]
}

type ModelSortState = {
  column: ModelSortColumn
  direction: "asc" | "desc"
}
const EMPTY_SELECT_VALUE = "__none__"

function normalizeProviderSource(providerType: string) {
  switch (providerType) {
    case "self_hosted":
    case "local":
      return "self_hosted"
    case "linkiq":
      return "linkiq"
    default:
      return "external"
  }
}

function providerSourceLabel(providerType: string) {
  switch (normalizeProviderSource(providerType)) {
    case "self_hosted":
      return "Self-hosted"
    case "linkiq":
      return "LinkIQ managed"
    default:
      return "External"
  }
}

function defaultCompatibilityMode(providerType: string) {
  return providerType === "anthropic" ? "anthropic" : "openai"
}

function formatCostPerMillion(value?: number) {
  if (!value || value <= 0) return "n/a"
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1 ? 2 : 4,
  }).format(value)
}

function formatDateTime(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function emptyProvider(): AIProvider {
  return {
    provider_id: "",
    label: "",
    provider_type: "external",
    compatibility_mode: defaultCompatibilityMode("external"),
    pricing_source_type: "litellm_fallback",
    pricing_refresh_hours: 24,
    pricing_source_url:
      "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json",
    description: "",
    base_url: "",
    api_key: "",
    organization: "",
    project: "",
    timeout_seconds: 30,
    status: "active",
  }
}

function emptyModel(providerID = ""): AIModel {
  return {
    model_id: "",
    provider_id: providerID,
    label: "",
    model_name: "",
    model_type: "completion",
    description: "",
    max_context_tokens: undefined,
    max_output_tokens: undefined,
    temperature: undefined,
    top_p: undefined,
    status: "active",
  }
}

export function AINLPView({
  initialModels,
  initialProviders,
}: Props) {
  const [hasMounted, setHasMounted] = React.useState(false)
  const [providers, setProviders] = React.useState(initialProviders)
  const [models, setModels] = React.useState(initialModels)
  const [selectedProviderID, setSelectedProviderID] = React.useState(
    initialProviders[0]?.provider_id ?? ""
  )
  const [selectedModelKey, setSelectedModelKey] = React.useState("")
  const [providerDraft, setProviderDraft] = React.useState<AIProvider>(() =>
    initialProviders[0]
      ? { ...initialProviders[0], provider_type: normalizeProviderSource(initialProviders[0].provider_type) }
      : emptyProvider()
  )
  const [modelDraft, setModelDraft] = React.useState<AIModel>(() => emptyModel(initialProviders[0]?.provider_id ?? ""))
  const [loading, setLoading] = React.useState(false)
  const [savingProvider, setSavingProvider] = React.useState(false)
  const [savingModel, setSavingModel] = React.useState(false)
  const [deletingProvider, setDeletingProvider] = React.useState(false)
  const [deletingModel, setDeletingModel] = React.useState(false)
  const [providerAdvancedOpen, setProviderAdvancedOpen] = React.useState(false)
  const [retrievingModels, setRetrievingModels] = React.useState(false)
  const [refreshingCosts, setRefreshingCosts] = React.useState(false)
  const [catalogLoading, setCatalogLoading] = React.useState(false)
  const [modelHistoryLoading, setModelHistoryLoading] = React.useState(false)
  const [modelHistory, setModelHistory] = React.useState<AIModelHistoryEntry[]>([])
  const [modelTestRunCount, setModelTestRunCount] = React.useState(0)
  const [carouselApi, setCarouselApi] = React.useState<CarouselApi>()
  const [catalogActionLoadingKey, setCatalogActionLoadingKey] = React.useState("")
  const [modelSort, setModelSort] = React.useState<ModelSortState>({
    column: "input_cost",
    direction: "asc",
  })
  const [catalog, setCatalog] = React.useState<{
    available: AIProviderModelCatalogEntry[]
    enabled: AIProviderModelCatalogEntry[]
  }>({ available: [], enabled: [] })

  const selectedProvider = React.useMemo(
    () => providers.find((provider) => provider.provider_id === selectedProviderID) ?? null,
    [providers, selectedProviderID]
  )

  const providerModels = React.useMemo(
    () => models.filter((model) => model.provider_id === selectedProviderID),
    [models, selectedProviderID]
  )

  const enabledCatalogEntries = catalog.enabled
  const availableCatalogEntries = catalog.available
  const sortedCatalogEntries = React.useMemo(
    () => sortCatalogEntries([...enabledCatalogEntries, ...availableCatalogEntries], modelSort),
    [enabledCatalogEntries, availableCatalogEntries, modelSort]
  )
  const selectedEnabledCatalogEntry = React.useMemo(
    () =>
      enabledCatalogEntries.find(
        (entry) => `enabled:${entry.enabled_model_id}` === selectedModelKey
      ) ?? null,
    [enabledCatalogEntries, selectedModelKey]
  )
  const selectedAvailableCatalogEntry = React.useMemo(
    () =>
      availableCatalogEntries.find(
        (entry) => `available:${entry.catalog_id}` === selectedModelKey
      ) ?? null,
    [availableCatalogEntries, selectedModelKey]
  )
  const selectedEnabledModel = React.useMemo(
    () =>
      selectedEnabledCatalogEntry?.enabled_model_id
        ? providerModels.find(
            (model) => model.model_id === selectedEnabledCatalogEntry.enabled_model_id
          ) ?? null
        : null,
    [providerModels, selectedEnabledCatalogEntry]
  )
  const modelHistoryColumns = React.useMemo<AuditHistoryColumn<AIModelHistoryEntry>[]>(
    () => [
      {
        id: "changed_at",
        label: "Date / time",
        defaultWidth: 170,
        minWidth: 140,
        sortable: true,
        sortValue: (row) => new Date(row.changed_at ?? "").getTime() || 0,
        render: (row) => formatDateTime(row.changed_at),
      },
      {
        id: "changed_by",
        label: "Changed by",
        defaultWidth: 140,
        minWidth: 120,
        sortable: true,
        sortValue: (row) => row.changed_by_username || row.changed_by_user_id || "System",
        render: (row) => row.changed_by_username || row.changed_by_user_id || "System",
      },
      {
        id: "reason",
        label: "Reason",
        defaultWidth: 130,
        minWidth: 110,
        render: (row) => row.change_reason,
      },
      {
        id: "input_cost",
        label: "Input / M",
        defaultWidth: 110,
        minWidth: 90,
        sortable: true,
        sortValue: (row) => row.input_cost_per_million || 0,
        render: (row) => formatCostPerMillion(row.input_cost_per_million),
      },
      {
        id: "output_cost",
        label: "Output / M",
        defaultWidth: 110,
        minWidth: 90,
        sortable: true,
        sortValue: (row) => row.output_cost_per_million || 0,
        render: (row) => formatCostPerMillion(row.output_cost_per_million),
      },
      {
        id: "status",
        label: "Status",
        defaultWidth: 90,
        minWidth: 80,
        render: (row) => row.status,
      },
    ],
    []
  )

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  React.useEffect(() => {
    setProviderDraft(
      selectedProvider
        ? { ...selectedProvider, provider_type: normalizeProviderSource(selectedProvider.provider_type) }
        : emptyProvider()
    )
    setProviderAdvancedOpen(false)
  }, [selectedProvider])

  React.useEffect(() => {
    if (!selectedProviderID) {
      setSelectedModelKey("")
      setModelDraft(emptyModel())
      return
    }

    const enabledSelection =
      enabledCatalogEntries.find((entry) => `enabled:${entry.enabled_model_id}` === selectedModelKey) ??
      null
    if (enabledSelection?.enabled_model_id) {
      const enabledModel = providerModels.find((model) => model.model_id === enabledSelection.enabled_model_id)
      if (enabledModel) {
        setModelDraft({ ...enabledModel })
        return
      }
    }

    const availableSelection =
      availableCatalogEntries.find((entry) => `available:${entry.catalog_id}` === selectedModelKey) ??
      null
    if (availableSelection) {
      setModelDraft({
        ...emptyModel(selectedProviderID),
        catalog_id: availableSelection.catalog_id,
        label: availableSelection.display_name?.trim() || availableSelection.model_name,
        model_name: availableSelection.model_name,
        max_context_tokens: availableSelection.max_context_tokens,
        max_output_tokens: availableSelection.max_output_tokens,
        pricing_source_type: availableSelection.pricing_source_type,
        pricing_source_url: availableSelection.pricing_source_url,
        pricing_refreshed_at: availableSelection.pricing_refreshed_at,
        input_cost_per_million: availableSelection.input_cost_per_million,
        output_cost_per_million: availableSelection.output_cost_per_million,
        cache_read_cost_per_million: availableSelection.cache_read_cost_per_million,
        cache_write_cost_per_million: availableSelection.cache_write_cost_per_million,
      })
      return
    }

    const defaultEnabled = enabledCatalogEntries[0]
    if (defaultEnabled?.enabled_model_id) {
      setSelectedModelKey(`enabled:${defaultEnabled.enabled_model_id}`)
      const enabledModel = providerModels.find((model) => model.model_id === defaultEnabled.enabled_model_id)
      setModelDraft(enabledModel ? { ...enabledModel } : emptyModel(selectedProviderID))
    } else if (availableCatalogEntries[0]) {
      setSelectedModelKey(`available:${availableCatalogEntries[0].catalog_id}`)
    } else {
      setSelectedModelKey("")
      setModelDraft(emptyModel(selectedProviderID))
    }
  }, [availableCatalogEntries, enabledCatalogEntries, providerModels, selectedModelKey, selectedProviderID])

  async function reloadAll() {
    setLoading(true)
    try {
      const [providersResponse, modelsResponse] = await Promise.all([
        getJson<{ providers?: AIProvider[] }>("/api/link-iq/ai/providers"),
        getJson<{ models?: AIModel[] }>("/api/link-iq/ai/models"),
      ])

      const nextProviders = providersResponse.providers ?? []
      const nextModels = modelsResponse.models ?? []

      setProviders(nextProviders)
      setModels(nextModels)

      if (nextProviders.length === 0) {
        setSelectedProviderID("")
      } else if (!nextProviders.some((provider) => provider.provider_id === selectedProviderID)) {
        setSelectedProviderID(nextProviders[0]?.provider_id ?? "")
      }
    } catch (error) {
      toast.error("Failed to reload AI & NLP settings", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadCatalog(providerID = selectedProviderID) {
    if (!providerID) {
      setCatalog({ enabled: [], available: [] })
      return
    }
    setCatalogLoading(true)
    try {
      const result = await getJson<{
        available?: AIProviderModelCatalogEntry[]
        enabled?: AIProviderModelCatalogEntry[]
      }>(`/api/link-iq/ai/providers/${providerID}/catalog`)
      setCatalog({
        enabled: result.enabled ?? [],
        available: result.available ?? [],
      })
    } catch (error) {
      toast.error("Failed to load provider model catalog", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
      setCatalog({ enabled: [], available: [] })
    } finally {
      setCatalogLoading(false)
    }
  }

  React.useEffect(() => {
    void loadCatalog()
  }, [selectedProviderID])

  React.useEffect(() => {
    async function loadModelHistory() {
      if (!selectedEnabledModel?.model_id) {
        setModelHistory([])
        return
      }
      setModelHistoryLoading(true)
      try {
        const result = await getJson<{ history?: AIModelHistoryEntry[] }>(
          `/api/link-iq/ai/models/${selectedEnabledModel.model_id}/history?limit=100`
        )
        setModelHistory(result.history ?? [])
      } catch (error) {
        toast.error("Failed to load model history", {
          description: error instanceof Error ? error.message : "Unknown error",
        })
        setModelHistory([])
      } finally {
        setModelHistoryLoading(false)
      }
    }

    void loadModelHistory()
  }, [selectedEnabledModel?.model_id])

  React.useEffect(() => {
    setModelTestRunCount(0)
  }, [selectedEnabledModel?.model_id])

  async function handleSaveProvider() {
    setSavingProvider(true)
    try {
      const saved = await postJson<AIProvider>("/api/link-iq/ai/providers", providerDraft)
      toast.success(providerDraft.provider_id ? "Provider updated" : "Provider created")
      await reloadAll()
      setSelectedProviderID(saved.provider_id)
      void loadCatalog(saved.provider_id)
    } catch (error) {
      toast.error("Failed to save provider", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSavingProvider(false)
    }
  }

  async function handleDeleteProvider() {
    if (!selectedProviderID) return
    setDeletingProvider(true)
    try {
      await deleteJson(`/api/link-iq/ai/providers/${selectedProviderID}`)
      toast.success("Provider deleted")
      setSelectedProviderID("")
      setSelectedModelKey("")
      setCatalog({ enabled: [], available: [] })
      await reloadAll()
    } catch (error) {
      toast.error("Failed to delete provider", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDeletingProvider(false)
    }
  }

  async function handleSaveModel() {
    setSavingModel(true)
    try {
      const saved = await postJson<AIModel>("/api/link-iq/ai/models", modelDraft)
      toast.success(
        modelDraft.model_id ? "Model updated" : modelDraft.catalog_id ? "Model enabled" : "Model created"
      )
      await reloadAll()
      await loadCatalog(saved.provider_id)
      setSelectedModelKey(`enabled:${saved.model_id}`)
      setModelHistory([])
      showEnabledModelStep()
    } catch (error) {
      toast.error("Failed to save model", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSavingModel(false)
    }
  }

  async function handleDeleteModel() {
    if (!modelDraft.model_id) return
    setDeletingModel(true)
    const fallbackCatalogID = modelDraft.catalog_id
    try {
      await deleteJson(`/api/link-iq/ai/models/${modelDraft.model_id}`)
      toast.success("Model disabled")
      await reloadAll()
      await loadCatalog(selectedProviderID)
      setModelHistory([])
      setSelectedModelKey(fallbackCatalogID ? `available:${fallbackCatalogID}` : "")
      showModelStep()
    } catch (error) {
      toast.error("Failed to delete model", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDeletingModel(false)
    }
  }

  async function handleRetrieveModels() {
    if (!selectedProviderID) {
      toast.error("Select a provider before retrieving models")
      return
    }

    setRetrievingModels(true)
    try {
      const result = await getJson<{ models?: { id: string }[] }>(
        `/api/link-iq/ai/providers/${selectedProviderID}/models`
      )
      const nextModels = result.models ?? []
      await handleRefreshPricing(false)
      await loadCatalog(selectedProviderID)
      if (nextModels.length > 0) {
        setSelectedModelKey((current) => current || "")
      }
      toast.success("Retrieved available models", {
        description:
          nextModels.length > 0
            ? `${nextModels.length} model${nextModels.length === 1 ? "" : "s"} returned`
            : "Provider returned no models",
      })
    } catch (error) {
      toast.error("Failed to retrieve provider models", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setRetrievingModels(false)
    }
  }

  async function handleRefreshPricing(showToast = true) {
    if (!selectedProviderID) return
    setRefreshingCosts(true)
    try {
      const result = await postJson<{ updated_count?: number }>(
        `/api/link-iq/ai/providers/${selectedProviderID}/pricing`,
        { force: true }
      )
      await reloadAll()
      await loadCatalog(selectedProviderID)
      if (showToast) {
        toast.success("Refreshed model costs", {
          description: `${result.updated_count ?? 0} catalog entr${(result.updated_count ?? 0) === 1 ? "y" : "ies"} updated`,
        })
      }
    } catch (error) {
      toast.error("Failed to refresh model costs", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setRefreshingCosts(false)
    }
  }

  async function handleEnableSelectedModel() {
    if (!selectedProviderID || !modelDraft.catalog_id) return
    setSavingModel(true)
    try {
      const saved = await postJson<AIModel>("/api/link-iq/ai/models/enable", {
        provider_id: selectedProviderID,
        catalog_id: modelDraft.catalog_id,
      })
      toast.success("Model enabled")
      await reloadAll()
      await loadCatalog(selectedProviderID)
      setSelectedModelKey(`enabled:${saved.model_id}`)
      setModelHistory([])
    } catch (error) {
      toast.error("Failed to enable model", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSavingModel(false)
    }
  }

  async function handleConfigureCatalogEntry(entry: AIProviderModelCatalogEntry) {
    setSelectedModelKey(`available:${entry.catalog_id}`)
    setModelHistory([])
    showModelStep()
  }

  async function handleDisableCatalogEntry(entry: AIProviderModelCatalogEntry) {
    if (!entry.enabled_model_id) return
    setCatalogActionLoadingKey(`enabled:${entry.enabled_model_id}`)
    try {
      await deleteJson(`/api/link-iq/ai/models/${entry.enabled_model_id}`)
      toast.success("Model disabled")
      await reloadAll()
      await loadCatalog(selectedProviderID)
      setModelHistory([])
      setSelectedModelKey((current) =>
        current === `enabled:${entry.enabled_model_id}` ? `available:${entry.catalog_id}` : current
      )
      showModelStep()
    } catch (error) {
      toast.error("Failed to disable model", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setCatalogActionLoadingKey("")
    }
  }

  function toggleModelSort(column: ModelSortColumn) {
    setModelSort((current) =>
      current.column === column
        ? {
            column,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : {
            column,
            direction: column === "name" ? "asc" : "asc",
          }
    )
  }

  function renderSortIcon(column: ModelSortColumn) {
    if (modelSort.column !== column) {
      return <ArrowUpDown className="size-3.5 text-muted-foreground" />
    }
    return modelSort.direction === "asc" ? (
      <ArrowUp className="size-3.5 text-foreground" />
    ) : (
      <ArrowDown className="size-3.5 text-foreground" />
    )
  }

  function showProviderStep() {
    carouselApi?.scrollTo(0)
  }

  function showModelStep() {
    carouselApi?.scrollTo(1)
  }

  function showEnabledModelStep() {
    carouselApi?.scrollTo(3)
  }

  async function handleRunModelTest(prompt: string): Promise<AIModelRunResult> {
    if (!selectedEnabledModel?.model_id) {
      throw new Error("Select an enabled model first")
    }

    return await postJson<AIModelRunResult>(
      `/api/link-iq/ai/models/${selectedEnabledModel.model_id}/run`,
      { prompt }
    )
  }

  if (!hasMounted) {
    return (
      <div className="flex h-full min-h-0 flex-1 gap-0 overflow-hidden px-4 py-4">
        <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)] gap-6 overflow-hidden">
          <div className="rounded-lg border bg-card/40" />
          <div className="rounded-lg border bg-card/40" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 gap-0 overflow-hidden px-4 py-4">
      <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)] gap-6 overflow-hidden">
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-5 overflow-y-auto pr-1">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Configure providers, models, and process-specific prompt execution.
              </div>
            </div>

            <div className="space-y-2">
              <ProviderModelTree
                providers={providers}
                models={models}
                selectedProviderID={selectedProviderID}
                selectedModelKey={selectedModelKey}
                onSelectProvider={(provider) => {
                  setSelectedProviderID(provider.provider_id)
                  setSelectedModelKey("")
                  setModelDraft(emptyModel(provider.provider_id))
                  showProviderStep()
                }}
                onSelectModel={(provider, model) => {
                  setSelectedProviderID(provider.provider_id)
                  setSelectedModelKey(`enabled:${model.model_id}`)
                  showEnabledModelStep()
                }}
                onCreateProvider={() => {
                  setSelectedProviderID("")
                  setSelectedModelKey("")
                  setProviderDraft(emptyProvider())
                  setModelDraft(emptyModel())
                  showProviderStep()
                }}
              />
              <div className="pt-1 text-xs text-muted-foreground">
                Select a provider to edit it and review the models currently available from that endpoint. Select an enabled model to inspect or update its managed parameters.
              </div>
            </div>
          </div>
        </div>

        <Carousel
          setApi={setCarouselApi}
          opts={{ align: "start", containScroll: "trimSnaps" }}
          className="h-full min-h-0"
        >
          <CarouselPrevious
            className="left-3 z-30 size-14 rounded-2xl border-white/15 bg-background/50 text-foreground shadow-xl backdrop-blur-md hover:bg-background/70"
            aria-label="Previous AI & NLP step"
          />
          <CarouselNext
            className="right-3 z-30 size-14 rounded-2xl border-white/15 bg-background/50 text-foreground shadow-xl backdrop-blur-md hover:bg-background/70"
            aria-label="Next AI & NLP step"
          />
          <CarouselContent className="h-full">
            <CarouselItem className="h-full basis-1/2">
              <ProviderFormCard
                providerDraft={providerDraft}
                providerSourceValue={normalizeProviderSource(providerDraft.provider_type)}
                providerAdvancedOpen={providerAdvancedOpen}
                savingProvider={savingProvider}
                deletingProvider={deletingProvider}
                onProviderAdvancedOpenChange={setProviderAdvancedOpen}
                onDraftChange={(updater) => setProviderDraft(updater)}
                onProviderSourceChange={(value) =>
                  setProviderDraft((current) => ({
                    ...current,
                    provider_type: value,
                  }))
                }
                onDelete={() => void handleDeleteProvider()}
                onSave={() => void handleSaveProvider()}
              />
            </CarouselItem>

            <CarouselItem className="h-full basis-1/2">
              <AvailableModelsCard
                selectedProviderID={selectedProviderID}
                selectedProviderLabel={selectedProvider?.label}
                refreshingCosts={refreshingCosts}
                retrievingModels={retrievingModels}
                catalogLoading={catalogLoading}
                catalogEntries={sortedCatalogEntries}
                selectedModelKey={selectedModelKey}
                onRefreshCosts={() => void handleRefreshPricing()}
                onRetrieveModels={() => void handleRetrieveModels()}
                onSelect={(entry) => {
                  setSelectedModelKey(
                    entry.enabled_model_id
                      ? `enabled:${entry.enabled_model_id}`
                      : `available:${entry.catalog_id}`
                  )
                  if (entry.enabled_model_id) {
                    showEnabledModelStep()
                    return
                  }
                  showModelStep()
                }}
                onEnable={(entry) => void handleConfigureCatalogEntry(entry)}
                onDisable={(entry) => void handleDisableCatalogEntry(entry)}
                renderSortIcon={renderSortIcon}
                onToggleSort={toggleModelSort}
                formatCostPerMillion={formatCostPerMillion}
                actionLoadingKey={catalogActionLoadingKey}
              />
            </CarouselItem>

            <CarouselItem className="h-full basis-1/2">
              <ModelParametersCard
                selectedEnabledModel={selectedEnabledModel}
                selectedAvailableCatalogEntry={selectedAvailableCatalogEntry}
                selectedProviderID={selectedProviderID}
                modelDraft={modelDraft}
                savingModel={savingModel}
                deletingModel={deletingModel}
                modelHistoryLoading={modelHistoryLoading}
                modelHistory={modelHistory}
                modelHistoryColumns={modelHistoryColumns}
                onDraftChange={(updater) => setModelDraft(updater)}
                onDeleteModel={() => void handleDeleteModel()}
                onSaveModel={() => void handleSaveModel()}
                onEnableSelectedModel={() => void handleEnableSelectedModel()}
                formatCostPerMillion={formatCostPerMillion}
              />
            </CarouselItem>

            <CarouselItem className="h-full basis-1/2">
              <ModelTestCard
                selectedEnabledModel={selectedEnabledModel}
                onRunModel={handleRunModelTest}
                onTestCompleted={() => setModelTestRunCount((current) => current + 1)}
              />
            </CarouselItem>

            <CarouselItem className="h-full basis-1/2">
              <ModelUsageCard
                selectedEnabledModel={selectedEnabledModel}
                selectedAvailableCatalogEntry={selectedAvailableCatalogEntry}
                modelHistory={modelHistory}
                testRunCount={modelTestRunCount}
                savingModel={savingModel}
                deletingModel={deletingModel}
                onEnableSelectedModel={() => void handleEnableSelectedModel()}
                onDisableSelectedModel={() => void handleDeleteModel()}
                formatCostPerMillion={formatCostPerMillion}
                formatDateTime={formatDateTime}
              />
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  )
}

function sortCatalogEntries(
  entries: AIProviderModelCatalogEntry[],
  sort: ModelSortState
) {
  return [...entries].sort((left, right) => {
    const direction = sort.direction === "asc" ? 1 : -1
    const leftValue = getCatalogEntrySortValue(left, sort.column)
    const rightValue = getCatalogEntrySortValue(right, sort.column)

    if (typeof leftValue === "string" && typeof rightValue === "string") {
      return leftValue.localeCompare(rightValue) * direction
    }
    if (leftValue === rightValue) return 0
    return (leftValue < rightValue ? -1 : 1) * direction
  })
}

function getCatalogEntrySortValue(
  entry: AIProviderModelCatalogEntry,
  column: ModelSortColumn
) {
  switch (column) {
    case "name":
      return (entry.display_name?.trim() || entry.model_name).toLowerCase()
    case "input_cost":
      return entry.input_cost_per_million ?? Number.POSITIVE_INFINITY
    case "output_cost":
      return entry.output_cost_per_million ?? Number.POSITIVE_INFINITY
    case "context":
      return entry.max_context_tokens ?? 0
  }
}
