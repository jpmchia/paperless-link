"use client"

import * as React from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getJson, postJson } from "@/lib/paperless-client"
import type { AIModel, AIProcessConfig, AIProvider } from "@/lib/link-iq-types"

type Props = {
  initialModels: AIModel[]
  initialProcesses: AIProcessConfig[]
  initialProviders: AIProvider[]
}

const EMPTY_SELECT_VALUE = "__none__"

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

export function ProcessesPromptsView({
  initialModels,
  initialProcesses,
  initialProviders,
}: Props) {
  const [providers, setProviders] = React.useState(initialProviders)
  const [models, setModels] = React.useState(initialModels)
  const [taxonomyProcessDraft, setTaxonomyProcessDraft] = React.useState<AIProcessConfig>(() => {
    return (
      initialProcesses.find((process) => process.process_key === "taxonomy.description") ??
      defaultTaxonomyProcess()
    )
  })
  const [loading, setLoading] = React.useState(false)
  const [savingProcess, setSavingProcess] = React.useState(false)

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
      setTaxonomyProcessDraft(
        nextProcesses.find((process) => process.process_key === "taxonomy.description") ??
          defaultTaxonomyProcess()
      )
    } catch (error) {
      toast.error("Failed to reload AI processes", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
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
    <div className="flex h-full min-h-0 flex-1 gap-0 overflow-hidden px-4 py-4">
      <Card className="min-h-0 w-full overflow-hidden">
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
  )
}
