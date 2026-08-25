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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import { toast } from "sonner"
import {
  createCorrespondent,
  updateCorrespondent,
  deleteCorrespondent,
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

type Correspondent = {
  id: number
  name: string
  matching_algorithm: number
  match: string
  is_insensitive: boolean
  document_count?: number
  last_correspondence?: string | null
}

const emptyCorrespondent = (): Partial<Correspondent> => ({
  name: "",
  matching_algorithm: 6,
  match: "",
  is_insensitive: false,
})

export function CorrespondentsTable({
  initialCorrespondents,
  initialEditCorrespondentId,
  onItemsChange,
  onSelectCorrespondent,
  selectLabel = "Use",
}: {
  initialEditCorrespondentId?: number | null
  initialCorrespondents: Correspondent[]
  onItemsChange?: (items: Correspondent[]) => void
  onSelectCorrespondent?: (correspondent: Correspondent) => void
  selectLabel?: string
}) {
  const { can } = usePermissions()
  const [items, setItems] = React.useState<Correspondent[]>(initialCorrespondents)
  const [search, setSearch] = React.useState("")
  const [editing, setEditing] = React.useState<Partial<Correspondent> | null>(null)
  const [isNew, setIsNew] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [page, setPage] = React.useState(1)
  const handledInitialEditIdRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    setItems(initialCorrespondents)
  }, [initialCorrespondents])

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

  React.useEffect(() => {
    if (initialEditCorrespondentId == null) {
      handledInitialEditIdRef.current = null
      return
    }

    if (handledInitialEditIdRef.current === initialEditCorrespondentId) {
      return
    }

    const item = items.find(
      (correspondent) => correspondent.id === initialEditCorrespondentId
    )
    if (!item) {
      return
    }

    handledInitialEditIdRef.current = initialEditCorrespondentId
    openEdit(item)
  }, [initialEditCorrespondentId, items])

  const openCreate = () => {
    setIsNew(true)
    setEditing(emptyCorrespondent())
  }

  const openEdit = (item: Correspondent) => {
    setIsNew(false)
    setEditing({ ...item })
  }

  const handleSave = async () => {
    if (!editing?.name?.trim()) return
    setSaving(true)
    try {
      if (isNew) {
        const created = await createCorrespondent({
          name: editing.name,
          matching_algorithm: editing.matching_algorithm ?? 6,
          match: editing.match ?? "",
          is_insensitive: editing.is_insensitive ?? false,
        })
        setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success(`Correspondent "${created.name}" created`)
      } else {
        const updated = await updateCorrespondent(editing.id!, {
          name: editing.name,
          matching_algorithm: editing.matching_algorithm,
          match: editing.match,
          is_insensitive: editing.is_insensitive,
        })
        setItems((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        toast.success(`Correspondent "${updated.name}" updated`)
      }
      setEditing(null)
    } catch (error) {
      toast.error("Failed to save", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (deleteId == null) return
    try {
      await deleteCorrespondent(deleteId)
      setItems((prev) => prev.filter((c) => c.id !== deleteId))
      toast.success("Correspondent deleted")
    } catch (error) {
      toast.error("Failed to delete", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return

    try {
      await Promise.all(selectedIds.map((id) => deleteCorrespondent(id)))
      setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)))
      toast.success(`${selectedIds.length} correspondent${selectedIds.length === 1 ? "" : "s"} deleted`)
      setSelectedIds([])
    } catch (error) {
      toast.error("Failed to delete selected", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search correspondents…"
            className="pl-8 h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <CanCreate type="correspondent">
          <Button onClick={openCreate} size="sm" className="h-8">
            <Plus className="mr-2 h-4 w-4" />
            Create Correspondent
          </Button>
        </CanCreate>
        <CanDelete type="correspondent">
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
                  aria-label="Select visible correspondents"
                />
              </TableHead>
              <TableHead className="!h-8">Name</TableHead>
              <TableHead className="!h-8">Matching</TableHead>
              <TableHead className="!h-8">Match pattern</TableHead>
              <TableHead className="!h-8 text-right">Docs</TableHead>
              <TableHead className="!h-8 text-right">Last seen</TableHead>
              <TableHead className="!h-8 text-right pr-[4.5rem]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                  {search ? "No correspondents match your search." : "No correspondents yet."}
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
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {item.last_correspondence
                      ? new Date(item.last_correspondence).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="ml-5 flex items-center justify-end gap-1">
                      {onSelectCorrespondent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 border border-accent px-1.5 text-xs text-accent hover:bg-accent/10 hover:text-accent-foreground"
                          onClick={() => onSelectCorrespondent(item)}
                        >
                          {selectLabel}
                        </Button>
                      )}
                      <CanChange type="correspondent">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </CanChange>
                      <CanDelete type="correspondent">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(item.id)}
                        >
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

      <p className="text-sm text-muted-foreground">
        {filtered.length} of {items.length} correspondents
      </p>
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

      {/* Edit / Create Dialog */}
      <PermissionGate allowed={editing !== null && can(isNew ? "create" : "change", "correspondent")}>
        <DraggableDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
          <DraggableDialogContent initialWidth={560} maxWidth={720}>
            <DraggableDialogHeader>
              <DraggableDialogTitle>{isNew ? "Create Correspondent" : "Edit Correspondent"}</DraggableDialogTitle>
            </DraggableDialogHeader>
            <DraggableDialogBody>
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="c-name">Name</Label>
                  <Input
                    id="c-name"
                    value={editing?.name ?? ""}
                    onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Correspondent name"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Matching algorithm</Label>
                  <Select
                    value={String(editing?.matching_algorithm ?? 6)}
                    onValueChange={(v) => setEditing((p) => ({ ...p, matching_algorithm: Number(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATCHING_ALGORITHMS.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(editing?.matching_algorithm ?? 6) !== 6 && (editing?.matching_algorithm ?? 6) !== 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="c-match">Match pattern</Label>
                    <Input
                      id="c-match"
                      value={editing?.match ?? ""}
                      onChange={(e) => setEditing((p) => ({ ...p, match: e.target.value }))}
                      placeholder="Pattern to match"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Switch
                    id="c-insensitive"
                    checked={editing?.is_insensitive ?? false}
                    onCheckedChange={(v) => setEditing((p) => ({ ...p, is_insensitive: v }))}
                  />
                  <Label htmlFor="c-insensitive">Case insensitive</Label>
                </div>
              </div>
            </DraggableDialogBody>
            <DraggableDialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !editing?.name?.trim()}>
                {saving ? "Saving…" : isNew ? "Create" : "Save"}
              </Button>
            </DraggableDialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>
      </PermissionGate>

      {/* Delete Confirmation */}
      <CanDelete type="correspondent">
        <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete correspondent?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the correspondent from all documents. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
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
