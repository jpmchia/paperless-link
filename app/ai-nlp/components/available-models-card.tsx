"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { AIProviderModelCatalogEntry } from "@/lib/link-iq-types"
import {
  ModelCatalogTableSection,
  type ModelSortColumn,
} from "./model-catalog-table-section"

type Props = {
  selectedProviderID: string
  selectedProviderLabel?: string
  refreshingCosts: boolean
  retrievingModels: boolean
  catalogLoading: boolean
  catalogEntries: AIProviderModelCatalogEntry[]
  selectedModelKey: string
  onRefreshCosts: () => void
  onRetrieveModels: () => void
  onSelect: (entry: AIProviderModelCatalogEntry) => void
  onEnable: (entry: AIProviderModelCatalogEntry) => void
  onDisable: (entry: AIProviderModelCatalogEntry) => void
  renderSortIcon: (column: ModelSortColumn) => React.ReactNode
  onToggleSort: (column: ModelSortColumn) => void
  formatCostPerMillion: (value?: number) => string
  actionLoadingKey?: string
}

export function AvailableModelsCard(props: Props) {
  const {
    selectedProviderID,
    selectedProviderLabel,
    refreshingCosts,
    retrievingModels,
    catalogLoading,
    catalogEntries,
    selectedModelKey,
    onRefreshCosts,
    onRetrieveModels,
    onSelect,
    onEnable,
    onDisable,
    renderSortIcon,
    onToggleSort,
    formatCostPerMillion,
    actionLoadingKey,
  } = props

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <span>Available</span>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xl font-semibold text-primary">
                {selectedProviderLabel?.trim() || "Provider"}
              </span>
              <span>models</span>
            </CardTitle>
            <CardDescription>
              Review the provider catalog, compare costs, and choose which models to enable in LinkIQ.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onRefreshCosts}
              disabled={!selectedProviderID || refreshingCosts}
            >
              {refreshingCosts ? "Refreshing..." : "Refresh costs"}
            </Button>
            <Button
              size="sm"
              onClick={onRetrieveModels}
              disabled={!selectedProviderID || retrievingModels}
            >
              <Plus className="size-4" />
              {retrievingModels ? "Retrieving..." : "Retrieve models"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden p-4">
        <ModelCatalogTableSection
          title="Models"
          entries={catalogEntries}
          selectedKey={selectedModelKey}
          emptyMessage={
            !selectedProviderID
              ? "Select or create a provider first."
              : !catalogLoading &&
                  catalogEntries.length === 0
                ? "Retrieve models from the provider to populate the catalog."
                : "No models available."
          }
          onSelect={onSelect}
          onEnable={onEnable}
          onDisable={onDisable}
          renderSortIcon={renderSortIcon}
          onToggleSort={onToggleSort}
          formatCostPerMillion={formatCostPerMillion}
          actionLoadingKey={actionLoadingKey}
        />
      </CardContent>
    </Card>
  )
}
