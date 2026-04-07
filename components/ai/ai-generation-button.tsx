"use client"

import * as React from "react"
import { ChevronDown, History, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type AIGenerationOption = {
  id: string
  label: string
}

export type AIGenerationOptionGroup = {
  key: string
  label: string
  options: AIGenerationOption[]
}

type Props = {
  actionLabel: string
  actionIcon?: React.ReactNode
  disabled?: boolean
  historyDisabled?: boolean
  loading?: boolean
  modelGroups: AIGenerationOptionGroup[]
  onAction: () => void
  onOpenHistory: () => void
  onSelectModel: (modelID: string) => void
  selectedModelID?: string
  selectedModelLabel?: string
}

export function AIGenerationButton({
  actionLabel,
  actionIcon,
  disabled = false,
  historyDisabled = false,
  loading = false,
  modelGroups,
  onAction,
  onOpenHistory,
  onSelectModel,
  selectedModelID,
  selectedModelLabel,
}: Props) {
  const hasModelOptions = modelGroups.some((group) => group.options.length > 0)

  return (
    <div className="inline-flex items-stretch">
      <Button
        type="button"
        size="sm"
        onClick={onAction}
        disabled={disabled || loading}
        className="rounded-r-none"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          actionIcon
        )}
        {loading ? "Generating" : actionLabel}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || loading || !hasModelOptions}
            className="max-w-[18rem] rounded-none border-l-0 px-3"
          >
            <span className="truncate">
              {selectedModelLabel || "Select model"}
            </span>
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Model selection</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={selectedModelID || ""}
            onValueChange={onSelectModel}
          >
            {modelGroups.map((group, groupIndex) =>
              group.options.length > 0 ? (
                <React.Fragment key={group.key}>
                  {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                  {group.options.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.id}
                      value={option.id}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </React.Fragment>
              ) : null
            )}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onOpenHistory}
        disabled={historyDisabled || loading}
        className="rounded-l-none border-l-0 px-3"
      >
        <History className="size-4" />
      </Button>
    </div>
  )
}
