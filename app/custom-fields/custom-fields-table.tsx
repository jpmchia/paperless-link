"use client"

import * as React from "react"
import { CanCreate } from "@/components/permissions/can-create"
import { CanDelete } from "@/components/permissions/can-delete"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog as DraggableDialog,
  DialogBody as DraggableDialogBody,
  DialogContent as DraggableDialogContent,
  DialogFooter as DraggableDialogFooter,
  DialogHeader as DraggableDialogHeader,
  DialogTitle as DraggableDialogTitle,
} from "@/components/draggable-dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Search, X } from "lucide-react"
import { toast } from "sonner"
import { useAsyncAction } from "@/hooks/use-async-action"
import {
  createCustomField, deleteCustomField,
} from "@/lib/management-actions"

const DATA_TYPES = [
  { id: "string", label: "Text" },
  { id: "url", label: "URL" },
  { id: "date", label: "Date" },
  { id: "boolean", label: "Boolean" },
  { id: "integer", label: "Integer" },
  { id: "float", label: "Float" },
  { id: "monetary", label: "Monetary" },
  { id: "document_link", label: "Document Link" },
  { id: "select", label: "Select" },
]

const PAGE_SIZE = 25

type CustomField = {
  id: number
  name: string
  data_type: string
  extra_data?: { select_options?: Array<string | { label: string; id?: string }> }
  document_count?: number
}

function createSelectOptionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16)
  }

  return Math.random().toString(36).slice(2, 18)
}

export function CustomFieldsTable({ initialItems }: { initialItems: CustomField[] }) {
  const [items, setItems] = React.useState<CustomField[]>(initialItems)
  const [search, setSearch] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [page, setPage] = React.useState(1)

  // Create form state
  const [newName, setNewName] = React.useState("")
  const [newType, setNewType] = React.useState("string")
  const [selectOptions, setSelectOptions] = React.useState<string[]>([])
  const [newOption, setNewOption] = React.useState("")

  const filtered = items.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const visibleIds = paged.map((item) => item.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))

  React.useEffect(() => {
    setPage(1)
  }, [search])

  const { pending: saving, run: createField } = useAsyncAction({
    action: async () => {
      if (!newName.trim()) {
        throw new Error("Custom field name is required")
      }

      const data: {
        data_type: string
        extra_data?: {
          select_options?: Array<{ label: string }>
        }
        name: string
      } = {
        name: newName,
        data_type: newType,
      }
      if (newType === "select" && selectOptions.length > 0) {
        data.extra_data = {
          select_options: selectOptions.map((label) => ({ label, id: createSelectOptionId() })),
        }
      }
      const created = await createCustomField(data)
      setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setCreating(false)
      toast.success(`Custom field "${created.name}" created`)
    },
    errorMessage: "Failed to create",
  })

  const { pending: deleting, run: removeField } = useAsyncAction({
    action: async (id: number) => {
      await deleteCustomField(id)
      return id
    },
    errorMessage: "Failed to delete",
  })

  const openCreate = () => {
    setNewName("")
    setNewType("string")
    setSelectOptions([])
    setNewOption("")
    setCreating(true)
  }

  const addOption = () => {
    const trimmed = newOption.trim()
    if (trimmed && !selectOptions.includes(trimmed)) {
      setSelectOptions((prev) => [...prev, trimmed])
      setNewOption("")
    }
  }

  const removeOption = (idx: number) => {
    setSelectOptions((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleCreate = async () => {
    try {
      await createField()
    } catch {
      // Error toast is handled by useAsyncAction.
    }
  }

  const handleDelete = async () => {
    if (deleteId == null) return
    try {
      const id = await removeField(deleteId)
      setItems((prev) => prev.filter((item) => item.id !== id))
      toast.success("Custom field deleted")
    } catch {
      // Error toast is handled by useAsyncAction.
    } finally {
      setDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    try {
      await Promise.all(selectedIds.map((id) => deleteCustomField(id)))
      setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)))
      toast.success(`${selectedIds.length} custom field${selectedIds.length === 1 ? "" : "s"} deleted`)
      setSelectedIds([])
    } catch {
      toast.error("Failed to delete selected")
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search custom fields…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <CanCreate type="customField">
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />Create Custom Field
          </Button>
        </CanCreate>
        <CanDelete type="customField">
          <Button
            variant="outline"
            onClick={() => void handleBulkDelete()}
            size="sm"
            disabled={selectedIds.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
        </CanDelete>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])))
                    } else {
                      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
                    }
                  }}
                  aria-label="Select visible custom fields"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Data type</TableHead>
              <TableHead>Options</TableHead>
              <TableHead className="text-right">Docs</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                  {search ? "No custom fields match your search." : "No custom fields yet."}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={(checked) => {
                        setSelectedIds((prev) =>
                          checked
                            ? Array.from(new Set([...prev, item.id]))
                            : prev.filter((id) => id !== item.id)
                        )
                      }}
                      aria-label={`Select ${item.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {DATA_TYPES.find((t) => t.id === item.data_type)?.label ?? item.data_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.data_type === "select" && item.extra_data?.select_options ? (
                      <div className="flex flex-wrap gap-1">
                        {item.extra_data.select_options.map((o, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {typeof o === "string" ? o : o.label}
                          </Badge>
                        ))}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {item.document_count ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <CanDelete type="customField">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CanDelete>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} of {items.length} custom fields</p>
      {pageCount > 1 && (
        <Pagination className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  setPage((current) => Math.max(1, current - 1))
                }}
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PaginationItem className="px-3 text-xs text-muted-foreground">
              Page {currentPage} of {pageCount}
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  setPage((current) => Math.min(pageCount, current + 1))
                }}
                aria-disabled={currentPage === pageCount}
                className={currentPage === pageCount ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Create Dialog */}
      <CanCreate type="customField">
        <DraggableDialog open={creating} onOpenChange={(o: boolean) => !o && setCreating(false)}>
          <DraggableDialogContent initialWidth={560} maxWidth={720}>
            <DraggableDialogHeader>
              <DraggableDialogTitle>Create Custom Field</DraggableDialogTitle>
            </DraggableDialogHeader>
            <DraggableDialogBody>
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cf-name">Name</Label>
                  <Input id="cf-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Field name" autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label>Data type</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DATA_TYPES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Data type cannot be changed after creation.</p>
                </div>

                {newType === "select" && (
                  <div className="space-y-1.5">
                    <Label>Options</Label>
                    {selectOptions.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {selectOptions.map((o, i) => (
                          <Badge key={i} variant="secondary" className="flex items-center gap-1 pr-1">
                            {o}
                            <button type="button" onClick={() => removeOption(i)} className="rounded-full p-0.5 hover:bg-muted">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        placeholder="Add option…"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addOption} disabled={!newOption.trim()}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DraggableDialogBody>
            <DraggableDialogFooter>
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              <Button
                onClick={() => void handleCreate()}
                disabled={saving || !newName.trim() || (newType === "select" && selectOptions.length === 0)}
              >
                {saving ? "Creating…" : "Create"}
              </Button>
            </DraggableDialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>
      </CanCreate>

      {/* Delete Confirmation */}
      <CanDelete type="customField">
        <AlertDialog open={deleteId !== null} onOpenChange={(o: boolean) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete custom field?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove this field and its values from all documents. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CanDelete>
    </>
  )
}
