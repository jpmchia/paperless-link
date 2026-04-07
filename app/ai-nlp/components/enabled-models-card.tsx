"use client"

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
  entries: AIProviderModelCatalogEntry[]
  selectedModelKey: string
  onSelect: (entry: AIProviderModelCatalogEntry) => void
  renderSortIcon: (column: ModelSortColumn) => React.ReactNode
  onToggleSort: (column: ModelSortColumn) => void
  formatCostPerMillion: (value?: number) => string
}

export function EnabledModelsCard({
  selectedProviderID,
  entries,
  selectedModelKey,
  onSelect,
  renderSortIcon,
  onToggleSort,
  formatCostPerMillion,
}: Props) {
  return (
    <Card className="min-h-0 h-full overflow-hidden">
      <CardHeader className="border-b pb-4">
        <CardTitle>Enabled models</CardTitle>
        <CardDescription>Your LinkIQ-managed model set for this provider.</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 overflow-hidden p-4">
        <ModelCatalogTableSection
          title="Enabled"
          entries={entries}
          selectedKey={selectedModelKey}
          emptyMessage={
            selectedProviderID ? "No enabled models yet." : "Select or create a provider first."
          }
          onSelect={onSelect}
          onEnable={() => {}}
          onDisable={() => {}}
          renderSortIcon={renderSortIcon}
          onToggleSort={onToggleSort}
          formatCostPerMillion={formatCostPerMillion}
        />
      </CardContent>
    </Card>
  )
}
