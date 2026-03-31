"use client"

import { Save, Trash2 } from "lucide-react"
import { AuditHistoryTable, type AuditHistoryColumn } from "@/components/audit-history-table"
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
import type {
  AIModel,
  AIModelHistoryEntry,
  AIProviderModelCatalogEntry,
} from "@/lib/link-iq-types"

type Props = {
  selectedEnabledModel: AIModel | null
  selectedAvailableCatalogEntry: AIProviderModelCatalogEntry | null
  selectedProviderID: string
  modelDraft: AIModel
  savingModel: boolean
  deletingModel: boolean
  modelHistoryLoading: boolean
  modelHistory: AIModelHistoryEntry[]
  modelHistoryColumns: AuditHistoryColumn<AIModelHistoryEntry>[]
  onDraftChange: (updater: (current: AIModel) => AIModel) => void
  onDeleteModel: () => void
  onSaveModel: () => void
  onEnableSelectedModel: () => void
  formatCostPerMillion: (value?: number) => string
}

export function ModelParametersCard({
  selectedEnabledModel,
  selectedAvailableCatalogEntry,
  selectedProviderID,
  modelDraft,
  savingModel,
  deletingModel,
  modelHistoryLoading,
  modelHistory,
  modelHistoryColumns,
  onDraftChange,
  onDeleteModel,
  onSaveModel,
  onEnableSelectedModel,
  formatCostPerMillion,
}: Props) {
  const displayName = selectedEnabledModel?.label.trim()
    || selectedAvailableCatalogEntry?.display_name?.trim()
    || selectedEnabledModel?.model_name
    || selectedAvailableCatalogEntry?.model_name
    || "Model"

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <span>Model parameters for</span>
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xl font-semibold text-primary">
            {displayName}
          </span>
        </CardTitle>
        <CardDescription>
          {selectedEnabledModel
            ? "Configure the enabled model and keep its managed settings in sync with provider pricing."
            : selectedAvailableCatalogEntry
              ? "Review provider metadata and pricing before enabling this model in LinkIQ."
              : "Select an enabled or available model to view details."}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 overflow-y-auto p-4">
        {selectedEnabledModel ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor="model-label">Label</Label>
              <Input
                id="model-label"
                value={modelDraft.label}
                onChange={(event) =>
                  onDraftChange((current) => ({ ...current, label: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model-name">Remote Model Name</Label>
              <Input
                id="model-name"
                value={modelDraft.model_name}
                onChange={(event) =>
                  onDraftChange((current) => ({ ...current, model_name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model-type">Model Type</Label>
              <Select
                value={modelDraft.model_type}
                onValueChange={(value) =>
                  onDraftChange((current) => ({ ...current, model_type: value }))
                }
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
              <Input
                id="model-context"
                type="number"
                value={modelDraft.max_context_tokens ?? ""}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    max_context_tokens: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model-output">Max Output Tokens</Label>
              <Input
                id="model-output"
                type="number"
                value={modelDraft.max_output_tokens ?? ""}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    max_output_tokens: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model-temperature">Temperature</Label>
              <Input
                id="model-temperature"
                type="number"
                step="0.1"
                value={modelDraft.temperature ?? ""}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    temperature: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model-top-p">Top P</Label>
              <Input
                id="model-top-p"
                type="number"
                step="0.1"
                value={modelDraft.top_p ?? ""}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    top_p: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model-status">Status</Label>
              <Select
                value={modelDraft.status}
                onValueChange={(value) =>
                  onDraftChange((current) => ({ ...current, status: value }))
                }
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
              <Textarea
                id="model-description"
                value={modelDraft.description ?? ""}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground lg:col-span-2">
              <div className="font-medium text-foreground">Current pricing</div>
              <div className="mt-2 flex flex-wrap gap-4">
                <span>Input: {formatCostPerMillion(modelDraft.input_cost_per_million)}/M</span>
                <span>Output: {formatCostPerMillion(modelDraft.output_cost_per_million)}/M</span>
                <span>Cache read: {formatCostPerMillion(modelDraft.cache_read_cost_per_million)}/M</span>
                <span>Cache write: {formatCostPerMillion(modelDraft.cache_write_cost_per_million)}/M</span>
              </div>
              <div className="mt-2">Source: {modelDraft.pricing_source_url || "Not set"}</div>
            </div>
            <div className="lg:col-span-2">
              <div className="mb-2 text-sm font-medium">Audit history</div>
              <AuditHistoryTable
                columns={modelHistoryColumns}
                rows={modelHistory}
                getRowId={(entry) => entry.revision_id}
                loading={modelHistoryLoading}
                defaultSortColumnId="changed_at"
                defaultSortDirection="desc"
                maxHeight={260}
                emptyMessage="No model revisions recorded yet."
              />
            </div>
            <div className="flex items-center justify-end gap-2 lg:col-span-2">
              <Button variant="outline" onClick={onDeleteModel} disabled={deletingModel || savingModel}>
                <Trash2 className="size-4" />
                Disable model
              </Button>
              <Button
                onClick={onSaveModel}
                disabled={
                  savingModel || !selectedProviderID || !modelDraft.label.trim() || !modelDraft.model_name.trim()
                }
              >
                <Save className="size-4" />
                Save model
              </Button>
            </div>
          </div>
        ) : selectedAvailableCatalogEntry ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor="available-model-label">Label</Label>
              <Input
                id="available-model-label"
                value={modelDraft.label}
                onChange={(event) =>
                  onDraftChange((current) => ({ ...current, label: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="available-model-name">Remote model name</Label>
              <Input
                id="available-model-name"
                value={modelDraft.model_name}
                onChange={(event) =>
                  onDraftChange((current) => ({ ...current, model_name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="available-model-type">Model type</Label>
              <Select
                value={modelDraft.model_type}
                onValueChange={(value) =>
                  onDraftChange((current) => ({ ...current, model_type: value }))
                }
              >
                <SelectTrigger id="available-model-type" className="w-full">
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
              <Label htmlFor="available-model-context">Max context tokens</Label>
              <Input
                id="available-model-context"
                type="number"
                value={modelDraft.max_context_tokens ?? ""}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    max_context_tokens: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="available-model-output">Max output tokens</Label>
              <Input
                id="available-model-output"
                type="number"
                value={modelDraft.max_output_tokens ?? ""}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    max_output_tokens: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="available-model-temperature">Temperature</Label>
              <Input
                id="available-model-temperature"
                type="number"
                step="0.1"
                value={modelDraft.temperature ?? ""}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    temperature: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="available-model-top-p">Top P</Label>
              <Input
                id="available-model-top-p"
                type="number"
                step="0.1"
                value={modelDraft.top_p ?? ""}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    top_p: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="available-model-status">Status</Label>
              <Select
                value={modelDraft.status}
                onValueChange={(value) =>
                  onDraftChange((current) => ({ ...current, status: value }))
                }
              >
                <SelectTrigger id="available-model-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor="available-model-description">Description</Label>
              <Textarea
                id="available-model-description"
                value={modelDraft.description ?? ""}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground lg:col-span-2">
              <div className="font-medium text-foreground">Pricing snapshot</div>
              <div className="mt-2 flex flex-wrap gap-4">
                <span>Input: {formatCostPerMillion(selectedAvailableCatalogEntry.input_cost_per_million)}/M</span>
                <span>Output: {formatCostPerMillion(selectedAvailableCatalogEntry.output_cost_per_million)}/M</span>
                <span>Cache read: {formatCostPerMillion(selectedAvailableCatalogEntry.cache_read_cost_per_million)}/M</span>
                <span>Cache write: {formatCostPerMillion(selectedAvailableCatalogEntry.cache_write_cost_per_million)}/M</span>
              </div>
              <div className="mt-2">
                Source: {selectedAvailableCatalogEntry.pricing_source_url || "Not set"}
              </div>
            </div>
            <div className="flex items-center justify-end lg:col-span-2">
              <Button
                onClick={onSaveModel}
                disabled={
                  savingModel || !selectedProviderID || !modelDraft.label.trim() || !modelDraft.model_name.trim()
                }
              >
                <Save className="size-4" />
                Save model
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Select an enabled or available model to view its details.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
