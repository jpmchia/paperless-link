"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AIProviderModelCatalogEntry } from "@/lib/link-iq-types"

export type ModelSortColumn = "name" | "input_cost" | "output_cost" | "context"

type Props = {
  title: string
  entries: AIProviderModelCatalogEntry[]
  selectedKey: string
  emptyMessage: string
  onSelect: (entry: AIProviderModelCatalogEntry) => void
  onEnable: (entry: AIProviderModelCatalogEntry) => void
  onDisable: (entry: AIProviderModelCatalogEntry) => void
  renderSortIcon: (column: ModelSortColumn) => React.ReactNode
  onToggleSort: (column: ModelSortColumn) => void
  formatCostPerMillion: (value?: number) => string
  actionLoadingKey?: string
}

export function ModelCatalogTableSection({
  title,
  entries,
  selectedKey,
  emptyMessage,
  onSelect,
  onEnable,
  onDisable,
  renderSortIcon,
  onToggleSort,
  formatCostPerMillion,
  actionLoadingKey,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border">
      <div className="ui-card-title border-b px-3 py-2">{title}</div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed caption-bottom text-xs">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-transparent">
              <th className="sticky top-0 z-10 h-10 w-[38%] bg-card/95 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground backdrop-blur supports-[backdrop-filter]:bg-card/75">
                <SortHeaderButton onClick={() => onToggleSort("name")}>
                  Model
                  {renderSortIcon("name")}
                </SortHeaderButton>
              </th>
              <th className="sticky top-0 z-10 h-10 w-[18%] bg-card/95 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground backdrop-blur supports-[backdrop-filter]:bg-card/75">
                <SortHeaderButton onClick={() => onToggleSort("input_cost")}>
                  Input / M
                  {renderSortIcon("input_cost")}
                </SortHeaderButton>
              </th>
              <th className="sticky top-0 z-10 h-10 w-[18%] bg-card/95 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground backdrop-blur supports-[backdrop-filter]:bg-card/75">
                <SortHeaderButton onClick={() => onToggleSort("output_cost")}>
                  Output / M
                  {renderSortIcon("output_cost")}
                </SortHeaderButton>
              </th>
              <th className="sticky top-0 z-10 h-10 w-[16%] bg-card/95 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground backdrop-blur supports-[backdrop-filter]:bg-card/75">
                <SortHeaderButton onClick={() => onToggleSort("context")}>
                  Context
                  {renderSortIcon("context")}
                </SortHeaderButton>
              </th>
              <th className="sticky top-0 z-10 h-10 w-[10%] bg-card/95 px-2 text-right align-middle font-medium whitespace-nowrap text-foreground backdrop-blur supports-[backdrop-filter]:bg-card/75">
                Status
              </th>
              <th className="sticky top-0 z-10 h-10 w-[16%] bg-card/95 px-2 text-right align-middle font-medium whitespace-nowrap text-foreground backdrop-blur supports-[backdrop-filter]:bg-card/75">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {entries.length > 0 ? (
              entries.map((entry) => {
                const rowKey = entry.enabled_model_id
                  ? `enabled:${entry.enabled_model_id}`
                  : `available:${entry.catalog_id}`
                const isSelected = rowKey === selectedKey
                return (
                  <tr
                    key={entry.catalog_id}
                    data-state={isSelected ? "selected" : undefined}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    onClick={() => onSelect(entry)}
                  >
                    <td className="p-2 align-middle whitespace-nowrap py-2.5">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-sm">
                          {entry.display_name?.trim() || entry.model_name}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {entry.model_name}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 align-middle whitespace-nowrap py-2.5 text-xs">
                      {formatCostPerMillion(entry.input_cost_per_million)}
                    </td>
                    <td className="p-2 align-middle whitespace-nowrap py-2.5 text-xs">
                      {formatCostPerMillion(entry.output_cost_per_million)}
                    </td>
                    <td className="p-2 align-middle whitespace-nowrap py-2.5 text-xs text-muted-foreground">
                      {formatContextTokens(entry.max_context_tokens)}
                    </td>
                    <td className="p-2 align-middle whitespace-nowrap py-2.5 text-right">
                      <Badge variant="outline">
                        {entry.enabled_model_id
                          ? "enabled"
                          : entry.pricing_match_status === "matched"
                            ? "priced"
                            : "unmatched"}
                      </Badge>
                    </td>
                    <td className="p-2 align-middle whitespace-nowrap py-2.5 text-right">
                      {(() => {
                        const isEnabled = Boolean(entry.enabled_model_id)
                        const isWorking = actionLoadingKey === rowKey
                        return (
                          <button
                            type="button"
                            className={
                              "rounded border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
                              (isEnabled
                                ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
                                : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15")
                            }
                            disabled={isWorking}
                            onClick={(event) => {
                              event.stopPropagation()
                              if (isEnabled) {
                                onDisable(entry)
                                return
                              }
                              onEnable(entry)
                            }}
                          >
                            {isWorking ? "Working..." : isEnabled ? "Disable" : "Configure"}
                          </button>
                        )
                      })()}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr className="border-b transition-colors hover:bg-transparent">
                <td colSpan={6} className="px-4 py-6 text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SortHeaderButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mx-1 flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      )}
    >
      {children}
    </button>
  )
}

function formatContextTokens(value?: number) {
  if (!value || value <= 0) return "n/a"
  return new Intl.NumberFormat("en-GB", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)
}
