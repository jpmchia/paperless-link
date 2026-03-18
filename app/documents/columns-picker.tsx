"use client"

import * as React from "react"
import {
  CUSTOM_FIELD_PREFIX,
  DISPLAY_FIELD_ADDED,
  DISPLAY_FIELD_ASN,
  DISPLAY_FIELD_CORRESPONDENT,
  DISPLAY_FIELD_CREATED,
  DISPLAY_FIELD_DOCUMENT_TYPE,
  DISPLAY_FIELD_MODIFIED,
  DISPLAY_FIELD_NOTES,
  DISPLAY_FIELD_OWNER,
  DISPLAY_FIELD_PAGE_COUNT,
  DISPLAY_FIELD_SHARED,
  DISPLAY_FIELD_STORAGE_PATH,
  DISPLAY_FIELD_TAGS,
  DISPLAY_FIELD_TITLE,
} from "./columns"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Columns, ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react"

const ALL_FIELDS: { id: string; label: string }[] = [
  { id: DISPLAY_FIELD_TITLE, label: "Title" },
  { id: DISPLAY_FIELD_CREATED, label: "Created" },
  { id: DISPLAY_FIELD_ADDED, label: "Added" },
  { id: DISPLAY_FIELD_MODIFIED, label: "Modified" },
  { id: DISPLAY_FIELD_CORRESPONDENT, label: "Correspondent" },
  { id: DISPLAY_FIELD_DOCUMENT_TYPE, label: "Document Type" },
  { id: DISPLAY_FIELD_STORAGE_PATH, label: "Storage Path" },
  { id: DISPLAY_FIELD_TAGS, label: "Tags" },
  { id: DISPLAY_FIELD_NOTES, label: "Notes" },
  { id: DISPLAY_FIELD_OWNER, label: "Owner" },
  { id: DISPLAY_FIELD_SHARED, label: "Shared" },
  { id: DISPLAY_FIELD_ASN, label: "ASN" },
  { id: DISPLAY_FIELD_PAGE_COUNT, label: "Pages" },
]

interface ColumnsPickerProps {
  customFields?: Array<{ id: number; name: string }>
  displayFields: string[]
  onDisplayFieldsChange: React.Dispatch<React.SetStateAction<string[]>>
}

export function ColumnsPicker({
  customFields = [],
  displayFields,
  onDisplayFieldsChange,
}: ColumnsPickerProps) {
  const allAvailableFields = React.useMemo(
    () => [
      ...ALL_FIELDS,
      ...customFields.map((cf) => ({
        id: `${CUSTOM_FIELD_PREFIX}${cf.id}`,
        label: cf.name,
      })),
    ],
    [customFields]
  )

  const moveField = (id: string, dir: "up" | "down") => {
    onDisplayFieldsChange((prev) => {
      const idx = prev.indexOf(id)
      if (idx === -1) return prev
      const next = [...prev]
      const swap = dir === "up" ? idx - 1 : idx + 1
      if (swap < 0 || swap >= next.length) return prev
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
  }

  const toggleField = (fieldId: string) => {
    onDisplayFieldsChange((prev) =>
      prev.includes(fieldId)
        ? prev.filter((f) => f !== fieldId)
        : [...prev, fieldId]
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" data-documents-hotkey="columns-trigger" title="Columns (Alt+C)">
          <Columns className="mr-2 h-4 w-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[260px] max-h-[440px] overflow-y-auto"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Active columns (drag order with ↑↓)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {displayFields.map((fieldId, idx) => {
          const meta = allAvailableFields.find((field) => field.id === fieldId)
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
                disabled={idx === 0}
                onClick={() => moveField(fieldId, "up")}
                title="Move up"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                disabled={idx === displayFields.length - 1}
                onClick={() => moveField(fieldId, "down")}
                title="Move down"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                onClick={() => toggleField(fieldId)}
                title="Hide column"
              >
                <EyeOff className="h-3 w-3" />
              </button>
            </div>
          )
        })}

        {(() => {
          const hidden = allAvailableFields.filter((field) => !displayFields.includes(field.id))
          if (hidden.length === 0) return null
          return (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Hidden columns
              </DropdownMenuLabel>
              {hidden.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <span className="flex-1 truncate">{field.label}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted"
                    onClick={() => toggleField(field.id)}
                    title="Show column"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </>
          )
        })()}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
