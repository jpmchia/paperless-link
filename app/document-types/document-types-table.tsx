"use client"

import * as React from "react"
import { CanCreate } from "@/components/permissions/can-create"
import { CanChange } from "@/components/permissions/can-change"
import { CanDelete } from "@/components/permissions/can-delete"
import { PermissionGate } from "@/components/permissions/permission-gate"
import { usePermissions } from "@/hooks/use-permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import { toast } from "sonner"
import { useAsyncAction } from "@/hooks/use-async-action"
import {
  createDocumentType, updateDocumentType, deleteDocumentType,
} from "@/lib/management-actions"

const MATCHING_ALGORITHMS = [
  { id: 0, label: "None" },
  { id: 1, label: "Any word" },
  { id: 2, label: "All words" },
  { id: 3, label: "Exact match" },
  { id: 4, label: "Regular expression" },
  { id: 5, label: "Fuzzy match" },
  { id: 6, label: "Automatic" },
]

const PAGE_SIZE = 25

type DocumentType = {
  id: number
  name: string
  matching_algorithm: number
  match: string
  is_insensitive: boolean
  document_count?: number
}

const emptyItem = (): Partial<DocumentType> => ({
  name: "",
  matching_algorithm: 6,
  match: "",
  is_insensitive: false,
})

export function DocumentTypesTable({
  initialItems,
  onItemsChange,
  onSelectDocumentType,
  selectLabel = "Use",
}: {
  initialItems: DocumentType[]
  onItemsChange?: (items: DocumentType[]) => void
  onSelectDocumentType?: (item: DocumentType) => void
  selectLabel?: string
}) {
  const { can } = usePermissions()
  const [items, setItems] = React.useState<DocumentType[]>(initialItems)
  const [search, setSearch] = React.useState("")
  const [editing, setEditing] = React.useState<Partial<DocumentType> | null>(null)
  const [isNew, setIsNew] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const filtered = items.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const visibleIds = paged.map((item) => item.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))

  React.useEffect(() => {
    onItemsChange?.(items)
  }, [items, onItemsChange])

  React.useEffect(() => {
    setPage(1)
  }, [search])

  const { pending: saving, run: saveDocumentType } = useAsyncAction({
    action: async () => {
      if (!editing?.name?.trim()) {
        throw new Error("Document type name is required")
      }

      if (isNew) {
        const created = await createDocumentType({
          name: editing.name,
          matching_algorithm: editing.matching_algorithm ?? 6,
          match: editing.match ?? "",
          is_insensitive: editing.is_insensitive ?? false,
        })
        setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success(`Document type "${created.name}" created`)
        return
      }

      const updated = await updateDocumentType(editing.id!, {
        name: editing.name,
        matching_algorithm: editing.matching_algorithm,
        match: editing.match,
        is_insensitive: editing.is_insensitive,
      })
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      toast.success(`Document type "${updated.name}" updated`)
    },
    errorMessage: "Failed to save",
  })

  const { pending: deleting, run: removeDocumentType } = useAsyncAction({
    action: async (id: number) => {
      await deleteDocumentType(id)
      return id
    },
    errorMessage: "Failed to delete",
  })

  const openCreate = () => { setIsNew(true); setEditing(emptyItem()) }
  const openEdit = (item: DocumentType) => { setIsNew(false); setEditing({ ...item }) }

  const handleSave = async () => {
    try {
      await saveDocumentType()
      setEditing(null)
    } catch {
      // Error toast is handled by useAsyncAction.
    }
  }

  const handleDelete = async () => {
    if (deleteId == null) return
    try {
      const id = await removeDocumentType(deleteId)
      setItems((prev) => prev.filter((item) => item.id !== id))
      toast.success("Document type deleted")
    } catch {
      // Error toast is handled by useAsyncAction.
    } finally {
      setDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    try {
      await Promise.all(selectedIds.map((id) => deleteDocumentType(id)))
      setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)))
      toast.success(`${selectedIds.length} document type${selectedIds.length === 1 ? "" : "s"} deleted`)
      setSelectedIds([])
    } catch {
      toast.error("Failed to delete selected")
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search document types…" className="pl-8 h-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <CanCreate type="documentType">
          <Button onClick={openCreate} size="sm" className="h-8">
            <Plus className="mr-2 h-4 w-4" />Create Document Type
          </Button>
        </CanCreate>
        <CanDelete type="documentType">
          <Button
            variant="outline"
            onClick={() => void handleBulkDelete()}
            size="sm"
            className="h-8"
            disabled={selectedIds.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
        </CanDelete>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="max-h-8">
            <TableRow className="bg-muted/50 text-xs max-h-8 p-0 m-0">
              <TableHead className="!h-8 w-8">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])))
                    } else {
                      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
                    }
                  }}
                  aria-label="Select visible document types"
                />
              </TableHead>
              <TableHead className="!h-8">Name</TableHead>
              <TableHead className="!h-8">Matching</TableHead>
              <TableHead className="!h-8">Match pattern</TableHead>
              <TableHead className="!h-8 text-right">Docs</TableHead>
              <TableHead className="!h-8 text-right pr-[4.5rem]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                  {search ? "No document types match your search." : "No document types yet."}
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
                  <TableCell className="text-muted-foreground text-sm">
                    {MATCHING_ALGORITHMS.find((a) => a.id === item.matching_algorithm)?.label ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono max-w-[200px] truncate">
                    {item.match || "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {item.document_count ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 ml-5">
                      {onSelectDocumentType && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-1.5 text-xs text-accent hover:text-accent-foreground border border-accent hover:bg-accent/10"
                          onClick={() => onSelectDocumentType(item)}
                        >
                          {selectLabel}
                        </Button>
                      )}
                      <CanChange type="documentType">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </CanChange>
                      <CanDelete type="documentType">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </CanDelete>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} of {items.length} document types</p>
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

      <PermissionGate allowed={editing !== null && can(isNew ? "create" : "change", "documentType")}>
        <DraggableDialog open={editing !== null} onOpenChange={(o: boolean) => !o && setEditing(null)}>
          <DraggableDialogContent initialWidth={560} maxWidth={720}>
            <DraggableDialogHeader>
              <DraggableDialogTitle>{isNew ? "Create Document Type" : "Edit Document Type"}</DraggableDialogTitle>
            </DraggableDialogHeader>
            <DraggableDialogBody>
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dt-name">Name</Label>
                  <Input id="dt-name" value={editing?.name ?? ""} onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))} placeholder="Document type name" autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label>Matching algorithm</Label>
                  <Select value={String(editing?.matching_algorithm ?? 6)} onValueChange={(v) => setEditing((p) => ({ ...p, matching_algorithm: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MATCHING_ALGORITHMS.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(editing?.matching_algorithm ?? 6) !== 6 && (editing?.matching_algorithm ?? 6) !== 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="dt-match">Match pattern</Label>
                    <Input id="dt-match" value={editing?.match ?? ""} onChange={(e) => setEditing((p) => ({ ...p, match: e.target.value }))} placeholder="Pattern to match" />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Switch id="dt-insensitive" checked={editing?.is_insensitive ?? false} onCheckedChange={(v) => setEditing((p) => ({ ...p, is_insensitive: v }))} />
                  <Label htmlFor="dt-insensitive">Case insensitive</Label>
                </div>
              </div>
            </DraggableDialogBody>
            <DraggableDialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => void handleSave()} disabled={saving || !editing?.name?.trim()}>
                {saving ? "Saving…" : isNew ? "Create" : "Save"}
              </Button>
            </DraggableDialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>
      </PermissionGate>

      <CanDelete type="documentType">
        <AlertDialog open={deleteId !== null} onOpenChange={(o: boolean) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete document type?</AlertDialogTitle>
              <AlertDialogDescription>This will remove the type from all documents. This cannot be undone.</AlertDialogDescription>
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
