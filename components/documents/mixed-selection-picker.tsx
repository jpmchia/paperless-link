"use client"

import * as React from "react"
import { ChevronsUpDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  flattenTagHierarchy,
  getTagPath,
  type HierarchicalTag,
} from "@/lib/tag-hierarchy"
import type { TriState } from "@/lib/bulk-selection-data"
import { cn } from "@/lib/utils"

type MixedTagPickerItem = HierarchicalTag & {
  color?: string | number
  text_color?: string | null
}

type MixedSelectionPickerProps = {
  tags: MixedTagPickerItem[]
  stateById: Record<number, TriState>
  onStateByIdChange: (next: Record<number, TriState>) => void
  placeholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

function assertNever(value: never): never {
  throw new Error(`Unhandled tri-state value: ${String(value)}`)
}

function cycleTriState(state: TriState): TriState {
  switch (state) {
    case "unselected":
      return "selected"
    case "partial":
      return "selected"
    case "selected":
      return "unselected"
    default:
      return assertNever(state)
  }
}

function selectionStateLabel(state: TriState) {
  switch (state) {
    case "selected":
      return "selected"
    case "partial":
      return "partially selected"
    case "unselected":
      return "not selected"
    default:
      return assertNever(state)
  }
}

export function MixedSelectionPicker({
  tags,
  stateById,
  onStateByIdChange,
  placeholder = "Select tags...",
  emptyText = "No tags found.",
  className,
  disabled = false,
}: MixedSelectionPickerProps) {
  const [open, setOpen] = React.useState(false)
  const flattened = React.useMemo(() => flattenTagHierarchy(tags), [tags])
  const selectedTags = React.useMemo(
    () =>
      tags.filter((tag) => {
        const state = stateById[tag.id] ?? "unselected"
        return state !== "unselected"
      }),
    [stateById, tags]
  )

  const handleToggle = React.useCallback(
    (id: number) => {
      const currentState = stateById[id] ?? "unselected"
      const nextState = cycleTriState(currentState)
      const nextStateById = { ...stateById }

      if (nextState === "unselected") {
        delete nextStateById[id]
      } else {
        nextStateById[id] = nextState
      }

      onStateByIdChange(nextStateById)
    },
    [onStateByIdChange, stateById]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("h-auto min-h-9 w-full justify-between py-1.5", className)}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-left">
            {selectedTags.length > 0 ? (
              selectedTags.map((tag) => {
                const state = stateById[tag.id] ?? "unselected"
                const label = getTagPath(tags, tag.id)

                return (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="max-w-full truncate px-2 py-0.5"
                  >
                    {state === "partial" ? `${label} (mixed)` : label}
                  </Badge>
                )
              })
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tags..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {flattened.map((tag) => {
                const state = stateById[tag.id] ?? "unselected"
                const path = getTagPath(tags, tag.id)

                return (
                  <CommandItem
                    key={tag.id}
                    value={path}
                    onSelect={() => handleToggle(tag.id)}
                  >
                    <Checkbox
                      checked={
                        state === "partial"
                          ? "indeterminate"
                          : state === "selected"
                      }
                      aria-label={`${path}: ${selectionStateLabel(state)}`}
                      className="mr-2"
                    />
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                      style={{
                        backgroundColor:
                          typeof tag.color === "string" ? tag.color : undefined,
                      }}
                    />
                    <span className="truncate" style={{ paddingLeft: `${tag.depth * 8}px` }}>
                      {path}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
