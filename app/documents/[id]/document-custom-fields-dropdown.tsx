"use client"

import * as React from "react"
import { useAtomValue } from "jotai"
import { Loader2, Plus, Search, Wrench } from "lucide-react"
import { toast } from "sonner"
import { createCustomField } from "@/lib/management-actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  documentDetailFieldLayoutAtom,
  documentDetailsControllerAtom,
} from "@/lib/store"
import { getDetailCustomFieldId } from "./detail-field-layout"

type CustomFieldDefinition = {
  id: number
  name: string
  data_type: string
}

interface DocumentCustomFieldsDropdownProps {
  customFields: CustomFieldDefinition[]
  disabled?: boolean
}

const DATA_TYPE_OPTIONS = [
  { label: "String", value: "string" },
  { label: "Long text", value: "long_text" },
  { label: "Date", value: "date" },
  { label: "Boolean", value: "boolean" },
  { label: "Integer", value: "integer" },
  { label: "Float", value: "float" },
  { label: "Monetary", value: "monetary" },
  { label: "URL", value: "url" },
  { label: "Select", value: "select" },
] as const

function formatDataType(dataType: string) {
  return dataType.replace(/_/g, " ")
}

export function DocumentCustomFieldsDropdown({
  customFields,
  disabled = false,
}: DocumentCustomFieldsDropdownProps) {
  const controller = useAtomValue(documentDetailsControllerAtom)
  const detailFieldLayout = useAtomValue(documentDetailFieldLayoutAtom)
  const [open, setOpen] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [newFieldName, setNewFieldName] = React.useState("")
  const [newFieldType, setNewFieldType] = React.useState<(typeof DATA_TYPE_OPTIONS)[number]["value"]>("string")
  const [allCustomFields, setAllCustomFields] = React.useState(customFields)

  React.useEffect(() => {
    setAllCustomFields(customFields)
  }, [customFields])

  const hiddenCustomFields = React.useMemo(
    () =>
      allCustomFields.filter(
        (field) => !detailFieldLayout.includes(getDetailCustomFieldId(field.id))
      ),
    [allCustomFields, detailFieldLayout]
  )

  const handleCreateField = React.useCallback(async () => {
    const trimmedName = newFieldName.trim()
    if (!trimmedName) return

    setCreating(true)
    try {
      const created = await createCustomField({
        name: trimmedName,
        data_type: newFieldType,
      })
      controller?.appendCustomFieldDefinition(created)
      setAllCustomFields((previous) =>
        previous.some((field) => field.id === created.id) ? previous : [...previous, created]
      )
      controller?.ensureFieldVisible(getDetailCustomFieldId(created.id))
      setCreateDialogOpen(false)
      setNewFieldName("")
      setNewFieldType("string")
      toast.success(`Created custom field "${trimmedName}"`)
    } catch (error) {
      toast.error("Failed to create custom field", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setCreating(false)
    }
  }, [controller, newFieldName, newFieldType])

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="secondary" className="h-8 hover:bg-accent" disabled={disabled || !controller}>
            <Wrench className="mr-2 h-4 w-4" />
            Custom Fields
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[320px] p-0">
          <Command>
            <CommandInput placeholder="Search custom fields..." />
            <CommandList>
              <CommandEmpty>
                <div className="flex items-center gap-2 px-2 py-4 text-sm text-muted-foreground">
                  <Search className="h-4 w-4" />
                  No hidden custom fields available.
                </div>
              </CommandEmpty>
              <CommandGroup>
                {hiddenCustomFields.map((field) => (
                  <CommandItem
                    key={field.id}
                    value={`${field.name} ${field.data_type}`}
                    onSelect={() => {
                      controller?.ensureFieldVisible(getDetailCustomFieldId(field.id))
                      setOpen(false)
                    }}
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <span>{field.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {formatDataType(field.data_type)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
                <CommandItem
                  value="create new custom field"
                  onSelect={() => {
                    setCreateDialogOpen(true)
                    setOpen(false)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create new field
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create custom field</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={newFieldName} onChange={(event) => setNewFieldName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data type</label>
              <Select value={newFieldType} onValueChange={(value) => setNewFieldType(value as typeof newFieldType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateField()} disabled={creating || newFieldName.trim().length === 0}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
