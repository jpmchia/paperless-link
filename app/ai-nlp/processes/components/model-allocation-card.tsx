"use client"

import * as React from "react"
import { CheckCircle2, Save } from "lucide-react"
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
import type { AIModel, AIProcessConfig, AIProvider } from "@/lib/link-iq-types"

const EMPTY_SELECT_VALUE = "__none__"

type Props = {
  promptDraft: AIProcessConfig
  providers: AIProvider[]
  models: AIModel[]
  onChangeProvider: (providerID: string) => void
  onChangeModel: (modelID: string) => void
  onSave: () => void
  saving: boolean
}

export function ModelAllocationCard({
  promptDraft,
  providers,
  models,
  onChangeProvider,
  onChangeModel,
  onSave,
  saving,
}: Props) {
  const providersWithModels = React.useMemo(() => {
    const modelProviderIDs = new Set(models.map((model) => model.provider_id))
    return providers.filter((provider) => modelProviderIDs.has(provider.provider_id))
  }, [models, providers])

  const providerModels = React.useMemo(
    () => models.filter((model) => model.provider_id === promptDraft.provider_id),
    [models, promptDraft.provider_id]
  )
  const selectedProvider = React.useMemo(
    () => providers.find((provider) => provider.provider_id === promptDraft.provider_id) ?? null,
    [providers, promptDraft.provider_id]
  )
  const selectedModel = React.useMemo(
    () => models.find((model) => model.model_id === promptDraft.model_id) ?? null,
    [models, promptDraft.model_id]
  )

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">Step 3. Model allocation</CardTitle>
        <CardDescription>
          Allocate the final provider and enabled model to the taxonomy description process.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="rounded-lg border bg-background p-4">
          <div className="text-sm font-medium">Current allocation</div>
          <div className="mt-2 text-xs text-muted-foreground">
            {selectedProvider && selectedModel
              ? `This process is currently allocated to ${selectedProvider.label} / ${selectedModel.label}.`
              : "No provider/model has been allocated to this process yet."}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="taxonomy-allocation-provider">Provider</Label>
            <Select
              value={promptDraft.provider_id || EMPTY_SELECT_VALUE}
              onValueChange={(value) => onChangeProvider(value === EMPTY_SELECT_VALUE ? "" : value)}
            >
              <SelectTrigger id="taxonomy-allocation-provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Select provider</SelectItem>
                {providersWithModels.map((provider) => (
                  <SelectItem key={provider.provider_id} value={provider.provider_id}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="taxonomy-allocation-model">Model</Label>
            <Select
              value={promptDraft.model_id || EMPTY_SELECT_VALUE}
              onValueChange={(value) => onChangeModel(value === EMPTY_SELECT_VALUE ? "" : value)}
            >
              <SelectTrigger id="taxonomy-allocation-model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Select model</SelectItem>
                {providerModels.map((model) => (
                  <SelectItem key={model.model_id} value={model.model_id}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground">
          Keep the prompt template separate from the allocation decision. That lets you compare multiple models against the same rendered prompt before assigning a single production model.
        </div>

        <div className="mt-auto flex items-center justify-end">
          <Button
            onClick={onSave}
            disabled={
              saving ||
              !promptDraft.prompt_template.trim() ||
              !promptDraft.provider_id ||
              !promptDraft.model_id
            }
          >
            <Save className="size-4" />
            Save allocation
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
