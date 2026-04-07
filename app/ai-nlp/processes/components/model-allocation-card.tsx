"use client"

import * as React from "react"
import {
  CheckCircle2,
  ChevronDown,
  CircleOff,
  History,
  Save,
  ShieldAlert,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  activityDisabled?: boolean
  manualSelectionModelID: string
  models: AIModel[]
  providers: AIProvider[]
  onChangeAvailableModel: (modelID: string, enabled: boolean) => void
  onChangeDefaultModel: (modelID: string) => void
  onChangeFallbackModel: (modelID: string) => void
  onChangeManualSelectionModel: (modelID: string) => void
  onOpenActivity: () => void
  onSave: () => void
  promptDraft: AIProcessConfig
  saving: boolean
}

export function ModelAllocationCard({
  activityDisabled = false,
  manualSelectionModelID,
  models,
  providers,
  onChangeAvailableModel,
  onChangeDefaultModel,
  onChangeFallbackModel,
  onChangeManualSelectionModel,
  onOpenActivity,
  onSave,
  promptDraft,
  saving,
}: Props) {
  const activeModels = React.useMemo(
    () =>
      [...models]
        .filter((model) => model.status !== "inactive")
        .sort((left, right) => left.label.localeCompare(right.label)),
    [models]
  )
  const modelByID = React.useMemo(
    () => new Map(activeModels.map((model) => [model.model_id, model])),
    [activeModels]
  )
  const providerNameByID = React.useMemo(
    () =>
      new Map(
        providers.map((provider) => [provider.provider_id, provider.label.trim()])
      ),
    [providers]
  )
  const defaultModel = promptDraft.default_model_id
    ? modelByID.get(promptDraft.default_model_id) ?? null
    : null
  const fallbackModel = promptDraft.fallback_model_id
    ? modelByID.get(promptDraft.fallback_model_id) ?? null
    : null
  const availableModels = (promptDraft.available_model_ids ?? [])
    .map((modelID) => modelByID.get(modelID) ?? null)
    .filter((model): model is AIModel => Boolean(model))
  const manualSelectionModel = manualSelectionModelID
    ? modelByID.get(manualSelectionModelID) ?? null
    : null

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">Step 3. Model allocation</CardTitle>
        <CardDescription>
          Configure the default execution path, fallback path, and the
          selectable models available when a process is manually induced.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="rounded-lg border bg-background p-4">
          <div className="text-sm font-medium">Current allocation</div>
          <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
            <AllocationSummary
              icon={<CheckCircle2 className="size-4 text-emerald-600" />}
              label="Default model"
              value={
                defaultModel
                  ? formatModelOptionLabel(defaultModel, providerNameByID)
                  : "Not set"
              }
            />
            <AllocationSummary
              icon={<ShieldAlert className="size-4 text-amber-600" />}
              label="Fallback model"
              value={
                fallbackModel
                  ? formatModelOptionLabel(fallbackModel, providerNameByID)
                  : "Not set"
              }
            />
            <AllocationSummary
              icon={<Sparkles className="size-4 text-primary" />}
              label="Available models"
              value={
                availableModels.length > 0
                  ? `${availableModels.length} configured`
                  : "None configured"
              }
            />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="taxonomy-default-model">Default model</Label>
              <Select
                value={promptDraft.default_model_id || EMPTY_SELECT_VALUE}
                onValueChange={(value) =>
                  onChangeDefaultModel(
                    value === EMPTY_SELECT_VALUE ? "" : value
                  )
                }
              >
                <SelectTrigger id="taxonomy-default-model">
                  <SelectValue placeholder="Select default model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_SELECT_VALUE}>
                    Select default model
                  </SelectItem>
                  {activeModels.map((model) => (
                    <SelectItem key={model.model_id} value={model.model_id}>
                      {formatModelOptionLabel(model, providerNameByID)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="taxonomy-fallback-model">Fallback model</Label>
              <Select
                value={promptDraft.fallback_model_id || EMPTY_SELECT_VALUE}
                onValueChange={(value) =>
                  onChangeFallbackModel(
                    value === EMPTY_SELECT_VALUE ? "" : value
                  )
                }
              >
                <SelectTrigger id="taxonomy-fallback-model">
                  <SelectValue placeholder="Select fallback model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_SELECT_VALUE}>
                    No fallback model
                  </SelectItem>
                  {activeModels
                    .filter((model) => model.model_id !== promptDraft.default_model_id)
                    .map((model) => (
                      <SelectItem key={model.model_id} value={model.model_id}>
                        {formatModelOptionLabel(model, providerNameByID)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Available manual models</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-between">
                    <span>
                      {availableModels.length > 0
                        ? `${availableModels.length} model${
                            availableModels.length === 1 ? "" : "s"
                          } selected`
                        : "Select available models"}
                    </span>
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-96">
                  <DropdownMenuLabel>Available models</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <ScrollArea className="h-72">
                    <div className="p-1">
                      {activeModels
                        .filter(
                          (model) =>
                            model.model_id !== promptDraft.default_model_id &&
                            model.model_id !== promptDraft.fallback_model_id
                        )
                        .map((model) => (
                          <DropdownMenuCheckboxItem
                            key={model.model_id}
                            checked={(promptDraft.available_model_ids ?? []).includes(
                              model.model_id
                            )}
                            onCheckedChange={(checked) =>
                              onChangeAvailableModel(
                                model.model_id,
                                Boolean(checked)
                              )
                            }
                            onSelect={(event) => event.preventDefault()}
                          >
                            {formatModelOptionLabel(model, providerNameByID)}
                          </DropdownMenuCheckboxItem>
                        ))}
                    </div>
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-4 rounded-lg border bg-muted/20 p-4">
            <div>
              <div className="text-sm font-medium">Manual invocation selector</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Use this button pattern wherever the process is manually
                induced. It exposes the default path, fallback path, and the
                configured manual options in one nested control.
              </div>
            </div>
            <ManualModelSelectorButton
              availableModels={availableModels}
              defaultModel={defaultModel}
              fallbackModel={fallbackModel}
              selectedModel={manualSelectionModel}
              onSelectModel={onChangeManualSelectionModel}
              providerNameByID={providerNameByID}
            />
            <div className="rounded-lg border bg-background p-3 text-xs text-muted-foreground">
              {manualSelectionModel ? (
                <>
                  Selected manual model:{" "}
                  <span className="font-medium text-foreground">
                    {formatModelOptionLabel(
                      manualSelectionModel,
                      providerNameByID
                    )}
                  </span>
                </>
              ) : (
                "Select a model from the preview button to verify the manual execution options."
              )}
            </div>
            <div className="mt-auto flex items-center justify-end">
              <Button
                variant="outline"
                onClick={onOpenActivity}
                disabled={activityDisabled}
              >
                <History className="size-4" />
                Activity
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground">
          The default model remains the process allocation sent to LinkIQ. The
          fallback and available lists are retained alongside the process
          definition so manually induced executions can surface alternatives
          without changing the canonical default path.
        </div>

        <div className="mt-auto flex items-center justify-end">
          <Button
            onClick={onSave}
            disabled={
              saving ||
              !promptDraft.prompt_template.trim() ||
              !promptDraft.default_model_id
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

function AllocationSummary({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-foreground">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <div className="mt-1 truncate">{value}</div>
    </div>
  )
}

function ManualModelSelectorButton({
  availableModels,
  defaultModel,
  fallbackModel,
  selectedModel,
  onSelectModel,
  providerNameByID,
}: {
  availableModels: AIModel[]
  defaultModel: AIModel | null
  fallbackModel: AIModel | null
  selectedModel: AIModel | null
  onSelectModel: (modelID: string) => void
  providerNameByID: Map<string, string>
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="justify-between">
          <span className="truncate">
            {selectedModel
              ? formatModelOptionLabel(selectedModel, providerNameByID)
              : "Choose manual execution model"}
          </span>
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel>Manual execution options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {defaultModel ? (
          <DropdownMenuItem onSelect={() => onSelectModel(defaultModel.model_id)}>
            <CheckCircle2 className="size-4 text-emerald-600" />
            Default: {formatModelOptionLabel(defaultModel, providerNameByID)}
          </DropdownMenuItem>
        ) : null}
        {fallbackModel ? (
          <DropdownMenuItem onSelect={() => onSelectModel(fallbackModel.model_id)}>
            <ShieldAlert className="size-4 text-amber-600" />
            Fallback: {formatModelOptionLabel(fallbackModel, providerNameByID)}
          </DropdownMenuItem>
        ) : null}
        {availableModels.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Sparkles className="size-4 text-primary" />
                Available models
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-80">
                {availableModels.map((model) => (
                  <DropdownMenuItem
                    key={model.model_id}
                    onSelect={() => onSelectModel(model.model_id)}
                  >
                    {formatModelOptionLabel(model, providerNameByID)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        ) : null}
        {!defaultModel && !fallbackModel && availableModels.length === 0 ? (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-3 text-xs text-muted-foreground">
              No manual execution options have been configured yet.
            </div>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function formatModelOptionLabel(
  model: AIModel,
  providerNameByID?: Map<string, string>
) {
  const providerName = providerNameByID?.get(model.provider_id) || model.provider_id
  return `${providerName} / ${model.label}`
}
