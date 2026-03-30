"use client"

import * as React from "react"
import { BrainCircuit, Plus, Save, Trash2 } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { deleteJson, getJson, postJson } from "@/lib/paperless-client"
import type { AIModel, AIProcessConfig, AIProvider } from "@/lib/link-iq-types"

type Props = {
  initialModels: AIModel[]
  initialProcesses: AIProcessConfig[]
  initialProviders: AIProvider[]
}

type WorkspaceSection = "models" | "processes"

const EMPTY_SELECT_VALUE = "__none__"

function emptyProvider(): AIProvider {
  return {
    provider_id: "",
    label: "",
    provider_type: "openai",
    compatibility_mode: "openai",
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

function defaultTaxonomyProcess(): AIProcessConfig {
  return {
    process_key: "taxonomy.description",
    section: "taxonomy",
    label: "Taxonomy Description",
    description: "Generate concise taxonomy node descriptions from node context.",
    provider_id: "",
    model_id: "",
    prompt_template:
      "Write a concise, business-friendly description for a taxonomy node.\n\nNode label: {{ .label }}\n{{ if .parent_path }}Parent path: {{ .parent_path }}\n{{ end }}{{ if .path_preview }}Full path: {{ .path_preview }}\n{{ end }}Source scope: {{ .source_scope }}\n{{ if .source_id }}Source identifier: {{ .source_id }}\n{{ end }}\nReturn only the description text in 1-2 sentences.",
    output_format: "text",
    status: "active",
  }
}

export function AINLPView({
  initialModels,
  initialProcesses,
  initialProviders,
}: Props) {
  const [section, setSection] = React.useState<WorkspaceSection>("models")
  const [providers, setProviders] = React.useState(initialProviders)
  const [models, setModels] = React.useState(initialModels)
  const [processes, setProcesses] = React.useState(initialProcesses)
  const [selectedProviderID, setSelectedProviderID] = React.useState(
    initialProviders[0]?.provider_id ?? ""
  )
  const [selectedModelID, setSelectedModelID] = React.useState("")
  const [providerDraft, setProviderDraft] = React.useState<AIProvider>(() =>
    initialProviders[0] ? { ...initialProviders[0] } : emptyProvider()
  )
  const [modelDraft, setModelDraft] = React.useState<AIModel>(() => emptyModel(initialProviders[0]?.provider_id ?? ""))
  const [taxonomyProcessDraft, setTaxonomyProcessDraft] = React.useState<AIProcessConfig>(() => {
    return (
      initialProcesses.find((process) => process.process_key === "taxonomy.description") ??
      defaultTaxonomyProcess()
    )
  })
  const [loading, setLoading] = React.useState(false)
  const [savingProvider, setSavingProvider] = React.useState(false)
  const [savingModel, setSavingModel] = React.useState(false)
  const [savingProcess, setSavingProcess] = React.useState(false)
  const [deletingProvider, setDeletingProvider] = React.useState(false)
  const [deletingModel, setDeletingModel] = React.useState(false)

  const selectedProvider = React.useMemo(
    () => providers.find((provider) => provider.provider_id === selectedProviderID) ?? null,
    [providers, selectedProviderID]
  )

  const providerModels = React.useMemo(
    () => models.filter((model) => model.provider_id === selectedProviderID),
    [models, selectedProviderID]
  )

  const selectedModel = React.useMemo(
    () => providerModels.find((model) => model.model_id === selectedModelID) ?? null,
    [providerModels, selectedModelID]
  )

  React.useEffect(() => {
    setProviderDraft(selectedProvider ? { ...selectedProvider } : emptyProvider())
  }, [selectedProvider])

  React.useEffect(() => {
    if (!selectedProviderID) {
      setSelectedModelID("")
      setModelDraft(emptyModel())
      return
    }

    const nextSelectedModel = selectedModel ?? providerModels[0] ?? null
    if (nextSelectedModel) {
      setSelectedModelID(nextSelectedModel.model_id)
      setModelDraft({ ...nextSelectedModel })
    } else {
      setSelectedModelID("")
      setModelDraft(emptyModel(selectedProviderID))
    }
  }, [providerModels, selectedModel, selectedProviderID])

  React.useEffect(() => {
    const taxonomyProcess =
      processes.find((process) => process.process_key === "taxonomy.description") ??
      defaultTaxonomyProcess()
    setTaxonomyProcessDraft(taxonomyProcess)
  }, [processes])

  async function reloadAll() {
    setLoading(true)
    try {
      const [providersResponse, modelsResponse, processesResponse] = await Promise.all([
        getJson<{ providers?: AIProvider[] }>("/api/link-iq/ai/providers"),
        getJson<{ models?: AIModel[] }>("/api/link-iq/ai/models"),
        getJson<{ processes?: AIProcessConfig[] }>("/api/link-iq/ai/processes"),
      ])

      const nextProviders = providersResponse.providers ?? []
      const nextModels = modelsResponse.models ?? []
      const nextProcesses = processesResponse.processes ?? []

      setProviders(nextProviders)
      setModels(nextModels)
      setProcesses(nextProcesses)

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

  async function handleSaveProvider() {
    setSavingProvider(true)
    try {
      const saved = await postJson<AIProvider>("/api/link-iq/ai/providers", providerDraft)
      toast.success(providerDraft.provider_id ? "Provider updated" : "Provider created")
      await reloadAll()
      setSelectedProviderID(saved.provider_id)
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
      toast.success(modelDraft.model_id ? "Model updated" : "Model created")
      await reloadAll()
      setSelectedModelID(saved.model_id)
    } catch (error) {
      toast.error("Failed to save model", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSavingModel(false)
    }
  }

  async function handleDeleteModel() {
    if (!selectedModelID) return
    setDeletingModel(true)
    try {
      await deleteJson(`/api/link-iq/ai/models/${selectedModelID}`)
      toast.success("Model deleted")
      setSelectedModelID("")
      await reloadAll()
    } catch (error) {
      toast.error("Failed to delete model", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDeletingModel(false)
    }
  }

  async function handleSaveProcess() {
    setSavingProcess(true)
    try {
      await postJson<AIProcessConfig>("/api/link-iq/ai/processes", taxonomyProcessDraft)
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

  return (
    <div className="flex h-full min-h-0 flex-1 gap-4 overflow-hidden p-6">
      <Card className="w-64 shrink-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BrainCircuit className="size-4" />
            AI & NLP
          </CardTitle>
          <CardDescription>
            Configure providers, models, and process-specific prompt execution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant={section === "models" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setSection("models")}
          >
            Models & Providers
          </Button>
          <Button
            variant={section === "processes" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setSection("processes")}
          >
            Processes & Prompts
          </Button>
          <div className="pt-3 text-xs text-muted-foreground">
            Prompts use Go <code>text/template</code> syntax, so simple substitution and
            <code> if / else </code> logic work without inventing a separate DSL.
          </div>
        </CardContent>
      </Card>

      {section === "models" ? (
        <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)] gap-4 overflow-hidden">
          <Card className="min-h-0 overflow-hidden">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Providers</CardTitle>
                  <CardDescription>External and local OpenAI-compatible endpoints.</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedProviderID("")
                    setProviderDraft(emptyProvider())
                    setSelectedModelID("")
                    setModelDraft(emptyModel())
                  }}
                >
                  <Plus className="size-4" />
                  New
                </Button>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 overflow-y-auto p-3">
              <div className="space-y-2">
                {providers.map((provider) => (
                  <button
                    key={provider.provider_id}
                    type="button"
                    onClick={() => setSelectedProviderID(provider.provider_id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                      provider.provider_id === selectedProviderID
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm">{provider.label}</div>
                      <Badge variant="outline">{provider.provider_type}</Badge>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {provider.base_url}
                    </div>
                  </button>
                ))}
                {providers.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No providers configured yet.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {providerDraft.provider_id ? "Edit Provider" : "Create Provider"}
                </CardTitle>
                <CardDescription>
                  Define the base URL, API key, and compatibility settings for an OpenAI-compatible provider.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="provider-label">Label</Label>
                  <Input id="provider-label" value={providerDraft.label} onChange={(event) => setProviderDraft((current) => ({ ...current, label: event.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="provider-type">Provider Type</Label>
                  <Select
                    value={providerDraft.provider_type}
                    onValueChange={(value) =>
                      setProviderDraft((current) => ({ ...current, provider_type: value }))
                    }
                  >
                    <SelectTrigger id="provider-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 lg:col-span-2">
                  <Label htmlFor="provider-base-url">Base API URL</Label>
                  <Input id="provider-base-url" value={providerDraft.base_url} onChange={(event) => setProviderDraft((current) => ({ ...current, base_url: event.target.value }))} placeholder="https://api.openai.com/v1" />
                </div>
                <div className="grid gap-2 lg:col-span-2">
                  <Label htmlFor="provider-api-key">API Key</Label>
                  <Input id="provider-api-key" value={providerDraft.api_key ?? ""} onChange={(event) => setProviderDraft((current) => ({ ...current, api_key: event.target.value }))} placeholder="sk-..." />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="provider-organization">Organization</Label>
                  <Input id="provider-organization" value={providerDraft.organization ?? ""} onChange={(event) => setProviderDraft((current) => ({ ...current, organization: event.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="provider-project">Project</Label>
                  <Input id="provider-project" value={providerDraft.project ?? ""} onChange={(event) => setProviderDraft((current) => ({ ...current, project: event.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="provider-timeout">Timeout Seconds</Label>
                  <Input id="provider-timeout" type="number" value={providerDraft.timeout_seconds ?? 30} onChange={(event) => setProviderDraft((current) => ({ ...current, timeout_seconds: Number(event.target.value) || 30 }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="provider-status">Status</Label>
                  <Select
                    value={providerDraft.status}
                    onValueChange={(value) =>
                      setProviderDraft((current) => ({ ...current, status: value }))
                    }
                  >
                    <SelectTrigger id="provider-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 lg:col-span-2">
                  <Label htmlFor="provider-description">Description</Label>
                  <Textarea id="provider-description" value={providerDraft.description ?? ""} onChange={(event) => setProviderDraft((current) => ({ ...current, description: event.target.value }))} />
                </div>
                <div className="flex items-center justify-between gap-3 lg:col-span-2">
                  <div className="text-xs text-muted-foreground">
                    Commercial provider plans, local runtimes, and managed models all fit through the same OpenAI-compatible execution contract.
                  </div>
                  <div className="flex items-center gap-2">
                    {providerDraft.provider_id ? (
                      <Button variant="outline" onClick={() => void handleDeleteProvider()} disabled={deletingProvider || savingProvider}>
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    ) : null}
                    <Button onClick={() => void handleSaveProvider()} disabled={savingProvider || !providerDraft.label.trim() || !providerDraft.base_url.trim()}>
                      <Save className="size-4" />
                      Save Provider
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-h-0 overflow-hidden">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Models</CardTitle>
                    <CardDescription>
                      Attach model definitions to the selected provider and classify their use.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedModelID("")
                      setModelDraft(emptyModel(selectedProviderID))
                    }}
                    disabled={!selectedProviderID}
                  >
                    <Plus className="size-4" />
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid min-h-0 grid-cols-[240px_minmax(0,1fr)] gap-4 overflow-hidden p-4">
                <div className="min-h-0 overflow-y-auto rounded-lg border p-2">
                  <div className="space-y-2">
                    {providerModels.map((model) => (
                      <button
                        key={model.model_id}
                        type="button"
                        onClick={() => setSelectedModelID(model.model_id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                          model.model_id === selectedModelID
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm">{model.label}</div>
                          <Badge variant="outline">{model.model_type}</Badge>
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {model.model_name}
                        </div>
                      </button>
                    ))}
                    {selectedProviderID && providerModels.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No models configured for this provider yet.
                      </div>
                    ) : null}
                    {!selectedProviderID ? (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        Select or create a provider first.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="min-h-0 overflow-y-auto">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="grid gap-2 lg:col-span-2">
                      <Label htmlFor="model-label">Label</Label>
                      <Input id="model-label" value={modelDraft.label} onChange={(event) => setModelDraft((current) => ({ ...current, label: event.target.value }))} disabled={!selectedProviderID} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="model-name">Remote Model Name</Label>
                      <Input id="model-name" value={modelDraft.model_name} onChange={(event) => setModelDraft((current) => ({ ...current, model_name: event.target.value }))} disabled={!selectedProviderID} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="model-type">Model Type</Label>
                      <Select
                        value={modelDraft.model_type}
                        onValueChange={(value) =>
                          setModelDraft((current) => ({ ...current, model_type: value }))
                        }
                        disabled={!selectedProviderID}
                      >
                        <SelectTrigger id="model-type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completion">Completions</SelectItem>
                          <SelectItem value="embedding">Embeddings</SelectItem>
                          <SelectItem value="vision">Vision</SelectItem>
                          <SelectItem value="ocr">OCR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="model-context">Max Context Tokens</Label>
                      <Input id="model-context" type="number" value={modelDraft.max_context_tokens ?? ""} onChange={(event) => setModelDraft((current) => ({ ...current, max_context_tokens: event.target.value ? Number(event.target.value) : undefined }))} disabled={!selectedProviderID} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="model-output">Max Output Tokens</Label>
                      <Input id="model-output" type="number" value={modelDraft.max_output_tokens ?? ""} onChange={(event) => setModelDraft((current) => ({ ...current, max_output_tokens: event.target.value ? Number(event.target.value) : undefined }))} disabled={!selectedProviderID} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="model-temperature">Temperature</Label>
                      <Input id="model-temperature" type="number" step="0.1" value={modelDraft.temperature ?? ""} onChange={(event) => setModelDraft((current) => ({ ...current, temperature: event.target.value ? Number(event.target.value) : undefined }))} disabled={!selectedProviderID} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="model-top-p">Top P</Label>
                      <Input id="model-top-p" type="number" step="0.1" value={modelDraft.top_p ?? ""} onChange={(event) => setModelDraft((current) => ({ ...current, top_p: event.target.value ? Number(event.target.value) : undefined }))} disabled={!selectedProviderID} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="model-status">Status</Label>
                      <Select
                        value={modelDraft.status}
                        onValueChange={(value) =>
                          setModelDraft((current) => ({ ...current, status: value }))
                        }
                        disabled={!selectedProviderID}
                      >
                        <SelectTrigger id="model-status" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2 lg:col-span-2">
                      <Label htmlFor="model-description">Description</Label>
                      <Textarea id="model-description" value={modelDraft.description ?? ""} onChange={(event) => setModelDraft((current) => ({ ...current, description: event.target.value }))} disabled={!selectedProviderID} />
                    </div>
                    <div className="flex items-center justify-end gap-2 lg:col-span-2">
                      {modelDraft.model_id ? (
                        <Button variant="outline" onClick={() => void handleDeleteModel()} disabled={deletingModel || savingModel}>
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      ) : null}
                      <Button onClick={() => void handleSaveModel()} disabled={savingModel || !selectedProviderID || !modelDraft.label.trim() || !modelDraft.model_name.trim()}>
                        <Save className="size-4" />
                        Save Model
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)] gap-4 overflow-hidden">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Processes</CardTitle>
              <CardDescription>
                Assign providers and models to concrete enrichment workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="secondary">
                Taxonomy
              </Button>
            </CardContent>
          </Card>

          <Card className="min-h-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Taxonomy Prompt Configuration</CardTitle>
              <CardDescription>
                This process is used to generate descriptions when a taxonomy node is being defined.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid min-h-0 gap-4 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="taxonomy-provider">Provider</Label>
                    <Select
                      value={taxonomyProcessDraft.provider_id || EMPTY_SELECT_VALUE}
                      onValueChange={(value) => {
                        const providerID = value === EMPTY_SELECT_VALUE ? "" : value
                        const nextModel = models.find((model) => model.provider_id === providerID)
                        setTaxonomyProcessDraft((current) => ({
                          ...current,
                          provider_id: providerID,
                          model_id:
                            nextModel && nextModel.provider_id === providerID
                              ? current.model_id &&
                                models.some(
                                  (model) =>
                                    model.provider_id === providerID &&
                                    model.model_id === current.model_id
                                )
                                ? current.model_id
                                : nextModel.model_id
                              : "",
                        }))
                      }}
                    >
                      <SelectTrigger id="taxonomy-provider" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_SELECT_VALUE}>Select provider</SelectItem>
                        {providers.map((provider) => (
                          <SelectItem key={provider.provider_id} value={provider.provider_id}>
                            {provider.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="taxonomy-model">Model</Label>
                    <Select
                      value={taxonomyProcessDraft.model_id || EMPTY_SELECT_VALUE}
                      onValueChange={(value) =>
                        setTaxonomyProcessDraft((current) => ({
                          ...current,
                          model_id: value === EMPTY_SELECT_VALUE ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger id="taxonomy-model" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_SELECT_VALUE}>Select model</SelectItem>
                        {models
                          .filter((model) => model.provider_id === taxonomyProcessDraft.provider_id)
                          .map((model) => (
                            <SelectItem key={model.model_id} value={model.model_id}>
                              {model.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="taxonomy-prompt">Prompt Template</Label>
                  <Textarea
                    id="taxonomy-prompt"
                    className="min-h-[26rem] font-mono text-xs"
                    value={taxonomyProcessDraft.prompt_template}
                    onChange={(event) =>
                      setTaxonomyProcessDraft((current) => ({
                        ...current,
                        prompt_template: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => void reloadAll()} disabled={loading}>
                    Reload
                  </Button>
                  <Button
                    onClick={() => void handleSaveProcess()}
                    disabled={savingProcess || !taxonomyProcessDraft.prompt_template.trim()}
                  >
                    <Save className="size-4" />
                    Save Taxonomy Process
                  </Button>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                <div>
                  <div className="text-sm font-medium">Template Syntax</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Recommended syntax is Go <code>text/template</code>. It gives us variable substitution and built-in <code>if</code>/<code>else</code> logic without introducing another runtime.
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium">Available Variables</div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <li><code>{'{{ .label }}'}</code> node label</li>
                    <li><code>{'{{ .parent_path }}'}</code> parent path</li>
                    <li><code>{'{{ .path_preview }}'}</code> proposed full path</li>
                    <li><code>{'{{ .source_scope }}'}</code> source scope</li>
                    <li><code>{'{{ .source_id }}'}</code> source identifier</li>
                    <li><code>{'{{ .existing_description }}'}</code> current description, if any</li>
                    <li><code>{'{{ index .business_context "organisation_name" }}'}</code> business context values from the Business Context screen</li>
                    <li><code>{'{{ .system_context }}'}</code> and <code>{'{{ .instance_context }}'}</code> maps for shared static fields</li>
                  </ul>
                </div>

                <div>
                  <div className="text-sm font-medium">Conditional Example</div>
                  <pre className="mt-2 overflow-x-auto rounded-md bg-background p-3 text-[11px] leading-5 text-muted-foreground"><code>{`Node label: {{ .label }}\n{{ if .parent_path }}Parent: {{ .parent_path }}{{ end }}`}</code></pre>
                </div>

                <div>
                  <div className="text-sm font-medium">Product Direction</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Keep provider and model assignments task-specific. That lets the commercial service layer route different enrichment workloads to managed or customer-supplied models without changing prompt definitions.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
