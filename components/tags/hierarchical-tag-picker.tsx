"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"

export type HierarchicalTagPickerItem = HierarchicalTag & {
  color?: string | number
  text_color?: string | null
}

export function HierarchicalTagPicker({
  tags,
  selectedIds,
  onSelectionChange,
  placeholder = "Select tags...",
  emptyText = "No tags found.",
  className,
  disabled = false,
  multiple = true,
}: {
  tags: HierarchicalTagPickerItem[]
  selectedIds: number[]
  onSelectionChange: (ids: number[]) => void
  placeholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  multiple?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const flattened = React.useMemo(() => flattenTagHierarchy(tags), [tags])
  const selected = selectedIds
    .map((id) => tags.find((tag) => tag.id === id))
    .filter((tag): tag is HierarchicalTagPickerItem => Boolean(tag))

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
            {selected.length > 0 ? (
              selected.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="max-w-full truncate px-2 py-0.5">
                  {getTagPath(tags, tag.id)}
                </Badge>
              ))
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
                const checked = selectedIds.includes(tag.id)
                const path = getTagPath(tags, tag.id)
                return (
                  <CommandItem
                    key={tag.id}
                    value={path}
                    onSelect={() => {
                      onSelectionChange(
                        checked
                          ? selectedIds.filter((id) => id !== tag.id)
                          : multiple
                            ? [...selectedIds, tag.id]
                            : [tag.id]
                      )
                      if (!multiple) setOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                      style={{ backgroundColor: typeof tag.color === "string" ? tag.color : undefined }}
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
