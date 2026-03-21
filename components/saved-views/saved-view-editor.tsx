"use client"

import * as React from "react"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Dialog as DraggableDialog,
  DialogBody as DraggableDialogBody,
  DialogContent as DraggableDialogContent,
  DialogDescription as DraggableDialogDescription,
  DialogFooter as DraggableDialogFooter,
  DialogHeader as DraggableDialogHeader,
  DialogTitle as DraggableDialogTitle,
} from "@/components/draggable-dialog"
import {
  CUSTOM_FIELD_PREFIX,
  DEFAULT_DISPLAY_FIELDS,
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
} from "@/app/documents/columns"
import {
  DOCUMENT_DISPLAY_MODES,
  type DocumentDisplayMode,
} from "@/app/documents/display-mode"
import {
  FilterRuleEditor,
  type SavedViewRule,
  type SavedViewRuleEditorLookups,
} from "./filter-rule-editor"

const PAGE_SIZES = [10, 25, 50, 100, 250]

export type SavedViewEditorValue = {
  id?: number
  name: string
  show_on_dashboard: boolean
  show_in_sidebar: boolean
  sort_field: string
  sort_reverse: boolean
  filter_rules: SavedViewRule[]
  page_size: number | null
  display_mode: DocumentDisplayMode | null
  display_fields: string[]
}

const SORT_FIELDS = [
  { value: "created", label: "Created" },
  { value: "added", label: "Added" },
  { value: "modified", label: "Modified" },
  { value: "title", label: "Title" },
  { value: "correspondent__name", label: "Correspondent" },
  { value: "archive_serial_number", label: "ASN" },
]

const DISPLAY_FIELD_OPTIONS = [
  { value: DISPLAY_FIELD_TITLE, label: "Title" },
  { value: DISPLAY_FIELD_CREATED, label: "Created date" },
  { value: DISPLAY_FIELD_ADDED, label: "Added date" },
  { value: DISPLAY_FIELD_MODIFIED, label: "Modified date" },
  { value: DISPLAY_FIELD_TAGS, label: "Tags" },
  { value: DISPLAY_FIELD_CORRESPONDENT, label: "Correspondent" },
  { value: DISPLAY_FIELD_DOCUMENT_TYPE, label: "Document type" },
  { value: DISPLAY_FIELD_STORAGE_PATH, label: "Storage path" },
  { value: DISPLAY_FIELD_OWNER, label: "Owner" },
  { value: DISPLAY_FIELD_NOTES, label: "Notes" },
  { value: DISPLAY_FIELD_SHARED, label: "Shared" },
  { value: DISPLAY_FIELD_ASN, label: "ASN" },
  { value: DISPLAY_FIELD_PAGE_COUNT, label: "Page count" },
]

export function SavedViewEditor({
  open,
  onOpenChange,
  value,
  onChange,
  onSave,
  onDuplicate,
  saving,
  isNew,
  lookups,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: SavedViewEditorValue | null
  onChange: (value: SavedViewEditorValue) => void
  onSave: () => void | Promise<void>
  onDuplicate?: () => void | Promise<void>
  saving?: boolean
  isNew: boolean
  lookups: SavedViewRuleEditorLookups
}) {
  const displayFieldOptions = React.useMemo(
    () => [
      ...DISPLAY_FIELD_OPTIONS,
      ...lookups.customFields.map((field) => ({
        value: `${CUSTOM_FIELD_PREFIX}${field.id}`,
        label: field.name,
      })),
    ],
    [lookups.customFields]
  )

  const current = value
  if (!current) return null

  const update = (patch: Partial<SavedViewEditorValue>) => {
    onChange({ ...current, ...patch })
  }

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange}>
      <DraggableDialogContent initialWidth={1120} initialHeight={920} maxWidth={1320} maxHeight={1040}>
        <DraggableDialogHeader>
          <DraggableDialogTitle>
            {isNew ? "Create saved view" : `Edit "${current.name}"`}
          </DraggableDialogTitle>
          <DraggableDialogDescription>
            Manage the full saved view object: filters, sort, display, and sidebar/dashboard visibility.
          </DraggableDialogDescription>
        </DraggableDialogHeader>

        <DraggableDialogBody className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-6">
              <div className="space-y-1.5">
                <Label htmlFor="saved-view-name">Name</Label>
                <Input
                  id="saved-view-name"
                  value={current.name}
                  onChange={(event) => update({ name: event.target.value })}
                  placeholder="Saved view name"
                  autoFocus
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Sort by</Label>
                  <Select value={current.sort_field} onValueChange={(value) => update({ sort_field: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Direction</Label>
                  <Select
                    value={current.sort_reverse ? "desc" : "asc"}
                    onValueChange={(value) => update({ sort_reverse: value === "desc" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Descending</SelectItem>
                      <SelectItem value="asc">Ascending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Display mode</Label>
                  <Select
                    value={current.display_mode ?? "default"}
                    onValueChange={(value) =>
                      update({
                        display_mode:
                          value === "default" ? null : (value as DocumentDisplayMode),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      {DOCUMENT_DISPLAY_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode === "smallCards"
                            ? "Small cards"
                            : mode === "largeCards"
                              ? "Large cards"
                              : "Table"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Page size</Label>
                  <Select
                    value={current.page_size != null ? String(current.page_size) : "default"}
                    onValueChange={(value) =>
                      update({
                        page_size: value === "default" ? null : Number(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      {PAGE_SIZES.map((pageSize) => (
                        <SelectItem key={pageSize} value={String(pageSize)}>
                          {pageSize} per page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Show on dashboard</p>
                    <p className="text-xs text-muted-foreground">
                      Expose this view as a dashboard widget.
                    </p>
                  </div>
                  <Switch
                    checked={current.show_on_dashboard}
                    onCheckedChange={(checked) => update({ show_on_dashboard: checked })}
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Show in sidebar</p>
                    <p className="text-xs text-muted-foreground">
                      Pin this view in the app sidebar.
                    </p>
                  </div>
                  <Switch
                    checked={current.show_in_sidebar}
                    onCheckedChange={(checked) => update({ show_in_sidebar: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Display fields</Label>
                <p className="text-xs text-muted-foreground">
                  Choose the fields shown in table/card views for this saved view.
                </p>
              </div>

              <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                {displayFieldOptions.map((field) => {
                  const checked = current.display_fields.includes(field.value)
                  return (
                    <label
                      key={field.value}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          if (next) {
                            update({
                              display_fields: [...current.display_fields, field.value],
                            })
                            return
                          }
                          update({
                            display_fields: current.display_fields.filter(
                              (candidate) => candidate !== field.value
                            ),
                          })
                        }}
                      />
                      <span>{field.label}</span>
                    </label>
                  )
                })}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => update({ display_fields: DEFAULT_DISPLAY_FIELDS })}
                >
                  Reset to defaults
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => update({ display_fields: [] })}
                >
                  Clear all
                </Button>
              </div>
            </div>
          </div>

          <FilterRuleEditor
            rules={current.filter_rules}
            lookups={lookups}
            onChange={(filter_rules) => update({ filter_rules })}
          />
        </DraggableDialogBody>

        <DraggableDialogFooter className="items-center justify-between gap-2 border-t pt-4">
          <div>
            {!isNew && onDuplicate ? (
              <Button type="button" variant="outline" onClick={() => void onDuplicate()}>
                <Copy className="mr-2 h-4 w-4" />
                Save as duplicate
              </Button>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onSave()}
              disabled={saving || !current.name.trim()}
            >
              {saving ? "Saving…" : isNew ? "Create" : "Save"}
            </Button>
          </div>
        </DraggableDialogFooter>
      </DraggableDialogContent>
    </DraggableDialog>
  )
}
