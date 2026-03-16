"use client"

import * as React from "react"
import { CanCreate } from "@/components/permissions/can-create"
import { CanDelete } from "@/components/permissions/can-delete"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
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

type CustomField = {
  id: number
  name: string
  data_type: string
  extra_data?: { select_options?: string[] }
  document_count?: number
}

export function CustomFieldsTable({ initialItems }: { initialItems: CustomField[] }) {
  const [items, setItems] = React.useState<CustomField[]>(initialItems)
  const [search, setSearch] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  // Create form state
  const [newName, setNewName] = React.useState("")
  const [newType, setNewType] = React.useState("string")
  const [selectOptions, setSelectOptions] = React.useState<string[]>([])
  const [newOption, setNewOption] = React.useState("")

  const filtered = items.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const { pending: saving, run: createField } = useAsyncAction({
    action: async () => {
      if (!newName.trim()) {
        throw new Error("Custom field name is required")
      }

      const data: {
        data_type: string
        extra_data?: { select_options?: string[] }
        name: string
      } = {
        name: newName,
        data_type: newType,
      }
      if (newType === "select" && selectOptions.length > 0) {
        data.extra_data = { select_options: selectOptions }
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
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                  {search ? "No custom fields match your search." : "No custom fields yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id}>
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
                          <Badge key={i} variant="outline" className="text-xs">{o}</Badge>
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

      {/* Create Dialog */}
      <CanCreate type="customField">
        <Dialog open={creating} onOpenChange={(o: boolean) => !o && setCreating(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Custom Field</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
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

            {/* Select options builder */}
            {newType === "select" && (
              <div className="space-y-1.5">
                <Label>Options</Label>
                {selectOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectOptions.map((o, i) => (
                      <Badge key={i} variant="secondary" className="flex items-center gap-1 pr-1">
                        {o}
                        <button type="button" onClick={() => removeOption(i)} className="rounded-full hover:bg-muted p-0.5">
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              <Button
                onClick={() => void handleCreate()}
                disabled={saving || !newName.trim() || (newType === "select" && selectOptions.length === 0)}
              >
                {saving ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
