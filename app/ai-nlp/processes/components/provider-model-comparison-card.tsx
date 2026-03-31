"use client"

import * as React from "react"
import { Play, WandSparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AIModel, AIProvider } from "@/lib/link-iq-types"
import type { ComparisonSlotState } from "./types"

const EMPTY_SELECT_VALUE = "__none__"

type Props = {
  promptTemplate: string
  renderedPrompt: string
  providers: AIProvider[]
  models: AIModel[]
  comparisonSlots: ComparisonSlotState[]
  onChangeComparisonProvider: (slotID: string, providerID: string) => void
  onChangeComparisonModel: (slotID: string, modelID: string) => void
  onRunComparison: (slotID: string) => void
}

export function ProviderModelComparisonCard({
  promptTemplate,
  renderedPrompt,
  providers,
  models,
  comparisonSlots,
  onChangeComparisonProvider,
  onChangeComparisonModel,
  onRunComparison,
}: Props) {
  const providersWithModels = React.useMemo(() => {
    const availableProviderIDs = new Set(models.map((model) => model.provider_id))
    return providers.filter((provider) => availableProviderIDs.has(provider.provider_id))
  }, [models, providers])

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">Step 2. Provider / Model comparison</CardTitle>
        <CardDescription>
          Compare the same rendered prompt across candidate provider and model combinations before allocating one.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="grid gap-4 xl:grid-cols-2">
          <PromptPreviewPanel
            title="Prompt template"
            description="The prompt template carried over from Step 1."
            icon={<WandSparkles className="size-4" />}
            content={promptTemplate}
          />
          <PromptPreviewPanel
            title="Example prompt"
            description="The rendered prompt with example values applied from the available field data."
            icon={<Play className="size-4" />}
            content={renderedPrompt}
          />
        </div>

        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-3">
          {comparisonSlots.map((slot, index) => {
            const slotModels = models.filter((model) => model.provider_id === slot.providerID)
            return (
              <ComparisonColumn
                key={slot.id}
                index={index + 1}
                providers={providersWithModels}
                models={slotModels}
                slot={slot}
                onChangeProvider={onChangeComparisonProvider}
                onChangeModel={onChangeComparisonModel}
                onRun={onRunComparison}
              />
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function PromptPreviewPanel({
  title,
  description,
  icon,
  content,
}: {
  title: string
  description: string
  icon: React.ReactNode
  content: string
}) {
  return (
    <div className="flex min-h-0 flex-col rounded-lg border bg-background">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <pre className="whitespace-pre-wrap px-4 py-4 text-xs leading-6 text-foreground">
          {content || "No prompt template configured yet."}
        </pre>
      </ScrollArea>
    </div>
  )
}

function ComparisonColumn({
  index,
  providers,
  models,
  slot,
  onChangeProvider,
  onChangeModel,
  onRun,
}: {
  index: number
  providers: AIProvider[]
  models: AIModel[]
  slot: ComparisonSlotState
  onChangeProvider: (slotID: string, providerID: string) => void
  onChangeModel: (slotID: string, modelID: string) => void
  onRun: (slotID: string) => void
}) {
  return (
    <div className="flex min-h-0 flex-col rounded-lg border bg-background">
      <div className="border-b px-4 py-3">
        <div className="text-sm font-medium">Comparison {index}</div>
      </div>
      <div className="grid gap-3 px-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor={`comparison-provider-${slot.id}`}>Provider</Label>
          <Select
            value={slot.providerID || EMPTY_SELECT_VALUE}
            onValueChange={(value) =>
              onChangeProvider(slot.id, value === EMPTY_SELECT_VALUE ? "" : value)
            }
          >
            <SelectTrigger id={`comparison-provider-${slot.id}`}>
              <SelectValue placeholder="Select provider" />
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
          <Label htmlFor={`comparison-model-${slot.id}`}>Model</Label>
          <Select
            value={slot.modelID || EMPTY_SELECT_VALUE}
            onValueChange={(value) =>
              onChangeModel(slot.id, value === EMPTY_SELECT_VALUE ? "" : value)
            }
          >
            <SelectTrigger id={`comparison-model-${slot.id}`}>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY_SELECT_VALUE}>Select model</SelectItem>
              {models.map((model) => (
                <SelectItem key={model.model_id} value={model.model_id}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => onRun(slot.id)} disabled={slot.running || !slot.modelID}>
          <Play className="size-4" />
          {slot.running ? "Running..." : "Run"}
        </Button>
      </div>

      <div className="border-t px-4 py-3">
        <div className="text-sm font-medium">Model output</div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-4 text-xs leading-6 text-foreground">
          {slot.error ? (
            <div className="text-destructive">{slot.error}</div>
          ) : slot.result?.output_text ? (
            <pre className="whitespace-pre-wrap">{slot.result.output_text}</pre>
          ) : (
            <div className="text-muted-foreground">
              Select a provider and enabled model, then run the comparison.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
