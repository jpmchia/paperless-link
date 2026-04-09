"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, ChevronUp, Eye, EyeOff, LayoutList } from "lucide-react"

interface DetailsFieldsPickerProps {
  availableFields: Array<{ id: string; label: string }>
  displayFields: string[]
  disabled?: boolean
  onDisplayFieldsChange: React.Dispatch<React.SetStateAction<string[]>>
}

export function DetailsFieldsPicker({
  availableFields,
  displayFields,
  disabled = false,
  onDisplayFieldsChange,
}: DetailsFieldsPickerProps) {
  const moveField = (id: string, direction: "up" | "down") => {
    onDisplayFieldsChange((prev) => {
      const index = prev.indexOf(id)
      if (index === -1) return prev

      const next = [...prev]
      const swapIndex = direction === "up" ? index - 1 : index + 1
      if (swapIndex < 0 || swapIndex >= next.length) return prev

      ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
      return next
    })
  }

  const toggleField = (fieldId: string) => {
    onDisplayFieldsChange((prev) =>
      prev.includes(fieldId)
        ? prev.filter((field) => field !== fieldId)
        : [...prev, fieldId]
    )
  }

  const hiddenFields = availableFields.filter((field) => !displayFields.includes(field.id))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="h-8 hover:bg-accent" disabled={disabled}>
          <LayoutList className="mr-2 h-4 w-4" />
          Fields
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[440px] w-[260px] overflow-y-auto"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Displayed fields
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {displayFields.map((fieldId, index) => {
          const meta = availableFields.find((field) => field.id === fieldId)
          if (!meta) return null

          return (
            <div
              key={fieldId}
              className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs hover:bg-accent"
            >
              <span className="flex-1 truncate">{meta.label}</span>
              <button
                type="button"
                className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                disabled={index === 0}
                onClick={() => moveField(fieldId, "up")}
                title="Move up"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                disabled={index === displayFields.length - 1}
                onClick={() => moveField(fieldId, "down")}
                title="Move down"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                onClick={() => toggleField(fieldId)}
                title="Hide field"
              >
                <EyeOff className="h-3 w-3" />
              </button>
            </div>
          )
        })}

        {hiddenFields.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Hidden fields
            </DropdownMenuLabel>
            {hiddenFields.map((field) => (
              <div
                key={field.id}
                className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <span className="flex-1 truncate">{field.label}</span>
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-muted"
                  onClick={() => toggleField(field.id)}
                  title="Show field"
                >
                  <Eye className="h-3 w-3" />
                </button>
              </div>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
