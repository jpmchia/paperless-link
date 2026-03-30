"use client"

import { Loader2, Plus, RefreshCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { ContextProfile } from "@/lib/link-iq-types"

type Props = {
  filteredProfiles: ContextProfile[]
  refreshing: boolean
  search: string
  selectedProfileID: string
  selectedTaxonomyRoot: string
  taxonomyRootOptions: string[]
  onNew: () => void
  onRefresh: () => void
  onSearchChange: (value: string) => void
  onSelectProfile: (profileID: string) => void
  onTaxonomyRootChange: (value: string) => void
}

export function DomainModelsContextPane({
  filteredProfiles,
  onNew,
  onRefresh,
  onSearchChange,
  onSelectProfile,
  onTaxonomyRootChange,
  refreshing,
  search,
  selectedProfileID,
  selectedTaxonomyRoot,
  taxonomyRootOptions,
}: Props) {
  return (
    <Card className="min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Context Navigator</div>
              <div className="text-[11px] text-muted-foreground">
                Pick the business context first, then compose the model in the center.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
                {refreshing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCcw className="size-4" />
                )}
                Refresh
              </Button>
              <Button size="sm" onClick={onNew}>
                <Plus className="size-4" />
                New
              </Button>
            </div>
          </div>

          <div className="mt-3 grid gap-3">
            <Input
              placeholder="Search label, taxonomy, document type"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            <div className="grid gap-2">
              <Label htmlFor="domain-model-root-filter">Taxonomy Root</Label>
              <Select value={selectedTaxonomyRoot} onValueChange={onTaxonomyRootChange}>
                <SelectTrigger id="domain-model-root-filter">
                  <SelectValue placeholder="All roots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All roots</SelectItem>
                  {taxonomyRootOptions.map((root) => (
                    <SelectItem key={root} value={root}>
                      {root}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="border-b bg-muted/20 px-4 py-3 text-[11px] text-muted-foreground">
          Select a profile to inspect and edit it on the right. The center pane is for structure, not metadata.
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredProfiles.length === 0 ? (
            <div className="flex h-full min-h-40 items-center justify-center p-6 text-center text-xs text-muted-foreground">
              No context profiles match the current filters.
            </div>
          ) : (
            <div className="divide-y">
              {filteredProfiles.map((profile) => {
                const isActive = profile.profile_id === selectedProfileID
                return (
                  <button
                    key={profile.profile_id}
                    type="button"
                    className={cn(
                      "flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      isActive && "bg-muted"
                    )}
                    onClick={() => onSelectProfile(profile.profile_id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{profile.label}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {profile.taxonomy_path || "No taxonomy constraint"}
                        </div>
                      </div>
                      <Badge variant="outline">v{profile.version}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{profile.document_type || "Any document type"}</span>
                      <span>•</span>
                      <span>{profile.entity_usages?.length ?? 0} entities</span>
                      <span>•</span>
                      <span>{profile.example_documents?.length ?? 0} examples</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
