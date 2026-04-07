"use client"

import { Activity, Clock3, Coins, FileClock } from "lucide-react"
import type { ComponentType } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type {
  AIModel,
  AIModelHistoryEntry,
  AIProviderModelCatalogEntry,
} from "@/lib/link-iq-types"

type Props = {
  selectedEnabledModel: AIModel | null
  selectedAvailableCatalogEntry?: AIProviderModelCatalogEntry | null
  modelHistory: AIModelHistoryEntry[]
  testRunCount: number
  savingModel?: boolean
  deletingModel?: boolean
  onEnableSelectedModel?: () => void
  onDisableSelectedModel?: () => void
  formatCostPerMillion: (value?: number) => string
  formatDateTime: (value?: string) => string
}

export function ModelUsageCard({
  selectedEnabledModel,
  selectedAvailableCatalogEntry = null,
  modelHistory,
  testRunCount,
  savingModel = false,
  deletingModel = false,
  onEnableSelectedModel,
  onDisableSelectedModel,
  formatCostPerMillion,
  formatDateTime,
}: Props) {
  const displayName = selectedEnabledModel?.label.trim() || selectedEnabledModel?.model_name || "Model"
  const latestHistory = modelHistory[0] ?? null

  return (
    <Card className="h-full min-h-0 overflow-hidden">
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span className="ui-card-title rounded-md bg-primary/10 px-2 text-primary">
            {displayName}
          </span>
          <span>usage</span>
        </CardTitle>
        <CardDescription>
          Review the current enabled model footprint, pricing snapshot, and recorded revision activity.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 overflow-y-auto p-4">
        {selectedEnabledModel ? (
          <div className="grid gap-4 md:grid-cols-2">
            <UsageStat
              icon={Activity}
              label="Status"
              value={selectedEnabledModel.status}
              hint={selectedEnabledModel.model_type}
            />
            <UsageStat
              icon={Clock3}
              label="Last updated"
              value={formatDateTime(selectedEnabledModel.updated_at)}
              hint={latestHistory ? `Last change: ${latestHistory.change_reason}` : "No revisions yet"}
            />
            <UsageStat
              icon={Coins}
              label="Input / Output cost"
              value={`${formatCostPerMillion(selectedEnabledModel.input_cost_per_million)}/M`}
              hint={`${formatCostPerMillion(selectedEnabledModel.output_cost_per_million)}/M output`}
            />
            <UsageStat
              icon={FileClock}
              label="Audit revisions"
              value={`${modelHistory.length}`}
              hint={`${testRunCount} prompt test${testRunCount === 1 ? "" : "s"} this session`}
            />

            <div className="rounded-lg border bg-muted/20 p-4 md:col-span-2">
              <div className="ui-card-title text-sm">Execution profile</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <KeyValue label="Remote model name" value={selectedEnabledModel.model_name} />
                <KeyValue label="Pricing source" value={selectedEnabledModel.pricing_source_url || "Not set"} />
                <KeyValue
                  label="Max context tokens"
                  value={selectedEnabledModel.max_context_tokens ? `${selectedEnabledModel.max_context_tokens}` : "Not set"}
                />
                <KeyValue
                  label="Max output tokens"
                  value={selectedEnabledModel.max_output_tokens ? `${selectedEnabledModel.max_output_tokens}` : "Not set"}
                />
                <KeyValue
                  label="Temperature / Top P"
                  value={`${selectedEnabledModel.temperature ?? "default"} / ${selectedEnabledModel.top_p ?? "default"}`}
                />
                <KeyValue
                  label="Last price refresh"
                  value={formatDateTime(selectedEnabledModel.pricing_refreshed_at)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 md:col-span-2">
              {selectedEnabledModel ? (
                <Button
                  variant="destructive"
                  onClick={onDisableSelectedModel}
                  disabled={deletingModel || savingModel}
                >
                  Disable model
                </Button>
              ) : selectedAvailableCatalogEntry ? (
                <Button
                  onClick={onEnableSelectedModel}
                  disabled={savingModel}
                >
                  Enable model
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="ui-help-text rounded-lg border border-dashed p-6">
            Select an enabled model to review its usage summary.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function UsageStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="ui-card-title flex items-center gap-2 text-sm">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
      {hint ? <div className="ui-help-text mt-1">{hint}</div> : null}
    </div>
  )
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="ui-field-label">
        {label}
      </div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  )
}
