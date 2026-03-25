"use client"

import * as React from "react"
import { CanCreate } from "@/components/permissions/can-create"
import { CanChange } from "@/components/permissions/can-change"
import { CanDelete } from "@/components/permissions/can-delete"
import { PermissionGate } from "@/components/permissions/permission-gate"
import { usePermissions } from "@/hooks/use-permissions"
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
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import { toast } from "sonner"
import { useAsyncAction } from "@/hooks/use-async-action"
import { createTag, updateTag, deleteTag } from "@/lib/management-actions"
import { tagColourHex, tagPillStyle, TAG_COLOUR_OPTIONS } from "@/lib/tag-colors"

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

type Tag = {
  id: number
  name: string
  color: string  // Paperless API returns hex string e.g. '#a6cee3'
  matching_algorithm: number
  match: string
  is_insensitive: boolean
  is_inbox_tag: boolean
  document_count?: number
}

const emptyTag = (): Partial<Tag> => ({
  name: "",
  color: TAG_COLOUR_OPTIONS[0].hex,
  matching_algorithm: 6,
  match: "",
  is_insensitive: false,
  is_inbox_tag: false,
})

export function TagsTable({
  initialTags,
  onItemsChange,
  onSelectTag,
  selectLabel = "Use",
}: {
  initialTags: Tag[]
  onItemsChange?: (items: Tag[]) => void
  onSelectTag?: (tag: Tag) => void
  selectLabel?: string
}) {
  const { can } = usePermissions()
  const [tags, setTags] = React.useState<Tag[]>(initialTags)
  const [search, setSearch] = React.useState("")
  const [editTag, setEditTag] = React.useState<Partial<Tag> | null>(null)
  const [isNew, setIsNew] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [page, setPage] = React.useState(1)

  const filtered = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const visibleIds = paged.map((tag) => tag.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))

  React.useEffect(() => {
    onItemsChange?.(tags)
  }, [onItemsChange, tags])

  React.useEffect(() => {
    setPage(1)
  }, [search])

  const { pending: saving, run: saveTag } = useAsyncAction({
    action: async () => {
      if (!editTag?.name?.trim()) {
        throw new Error("Tag name is required")
      }

      if (isNew) {
        const created = await createTag({
          name: editTag.name,
          color: editTag.color ?? TAG_COLOUR_OPTIONS[0].hex,
          matching_algorithm: editTag.matching_algorithm ?? 6,
          match: editTag.match ?? "",
          is_insensitive: editTag.is_insensitive ?? false,
          is_inbox_tag: editTag.is_inbox_tag ?? false,
        })
        setTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success(`Tag "${created.name}" created`)
        return
      }

      const updated = await updateTag(editTag.id!, {
        name: editTag.name,
        color: editTag.color,
        matching_algorithm: editTag.matching_algorithm,
        match: editTag.match,
        is_insensitive: editTag.is_insensitive,
      })
      setTags((prev) => prev.map((tag) => (tag.id === updated.id ? updated : tag)))
      toast.success(`Tag "${updated.name}" updated`)
    },
    errorMessage: "Failed to save tag",
  })

  const { pending: deleting, run: removeTag } = useAsyncAction({
    action: async (id: number) => {
      await deleteTag(id)
      return id
    },
    errorMessage: "Failed to delete tag",
  })

  const { pending: bulkDeleting, run: removeSelectedTags } = useAsyncAction({
    action: async () => {
      const ids = [...selectedIds]
      await Promise.all(ids.map((id) => deleteTag(id)))
      return ids
    },
    errorMessage: "Failed to delete selected tags",
  })

  const openCreate = () => {
    setIsNew(true)
    setEditTag(emptyTag())
  }

  const openEdit = (tag: Tag) => {
    setIsNew(false)
    setEditTag({ ...tag })
  }

  const handleSave = async () => {
    try {
      await saveTag()
      setEditTag(null)
    } catch {
      // Error toast is handled by useAsyncAction.
    }
  }

  const handleDelete = async () => {
    if (deleteId == null) return
    try {
      const id = await removeTag(deleteId)
      setTags((prev) => prev.filter((tag) => tag.id !== id))
      toast.success("Tag deleted")
    } catch {
      // Error toast is handled by useAsyncAction.
    } finally {
      setDeleteId(null)
    }
  }

  const toggleVisibleSelection = (checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])))
      return
    }

    setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return

    try {
      const ids = await removeSelectedTags()
      setTags((prev) => prev.filter((tag) => !ids.includes(tag.id)))
      setSelectedIds([])
      toast.success(`${ids.length} tag${ids.length === 1 ? "" : "s"} deleted`)
    } catch {
      // Error toast is handled by useAsyncAction.
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tags…"
            className="pl-8 h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <CanCreate type="tag">
          <Button onClick={openCreate} size="sm" className="h-8">
            <Plus className="mr-2 h-4 w-4" />
            Create Tag
          </Button>
        </CanCreate>
        <CanDelete type="tag">
          <Button
            variant="outline"
            onClick={() => void handleBulkDelete()}
            size="sm"
            className="h-8"
            disabled={selectedIds.length === 0 || bulkDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
        </CanDelete>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="max-h-8">
            <TableRow className="bg-muted/50 text-xs max-h-8 p-0 m-0">
              <TableHead className="!h-8 w-8">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => toggleVisibleSelection(Boolean(checked))}
                  aria-label="Select visible tags"
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
                  {search ? "No tags match your search." : "No tags yet. Create one to get started."}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.includes(tag.id)}
                        onCheckedChange={(checked) => {
                          setSelectedIds((prev) =>
                            checked
                              ? [...prev, tag.id]
                              : prev.filter((id) => id !== tag.id)
                          )
                        }}
                        aria-label={`Select ${tag.name}`}
                      />
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: tagColourHex(tag.color) }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={tagPillStyle(tag.color)}
                    >
                      {tag.name}
                    </span>
                    {tag.is_inbox_tag && (
                      <Badge variant="outline" className="ml-2 text-xs">Inbox</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {MATCHING_ALGORITHMS.find((a) => a.id === tag.matching_algorithm)?.label ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono max-w-[200px] truncate">
                    {tag.match || <span className="opacity-30">—</span>}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {tag.document_count ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="ml-5 flex items-center justify-end gap-1">
                      {onSelectTag && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 border border-accent px-1.5 text-xs text-accent hover:bg-accent/10 hover:text-accent-foreground"
                          onClick={() => onSelectTag(tag)}
                        >
                          {selectLabel}
                        </Button>
                      )}
                      <CanChange type="tag">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tag)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </CanChange>
                      <CanDelete type="tag">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(tag.id)}
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
        {filtered.length} of {tags.length} tags
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
      <PermissionGate allowed={editTag !== null && can(isNew ? "create" : "change", "tag")}>
        <DraggableDialog open={editTag !== null} onOpenChange={(o: boolean) => !o && setEditTag(null)}>
          <DraggableDialogContent initialWidth={560} maxWidth={720}>
            <DraggableDialogHeader>
              <DraggableDialogTitle>{isNew ? "Create Tag" : "Edit Tag"}</DraggableDialogTitle>
            </DraggableDialogHeader>
            <DraggableDialogBody>
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tag-name">Name</Label>
                  <Input
                    id="tag-name"
                    value={editTag?.name ?? ""}
                    onChange={(e) => setEditTag((p: Partial<Tag> | null) => ({ ...p, name: e.target.value }))}
                    placeholder="Tag name"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Preview</Label>
                  <div>
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={tagPillStyle(editTag?.color ?? TAG_COLOUR_OPTIONS[0].hex)}
                    >
                      {editTag?.name || "Tag name"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Colour</Label>
                  <div className="flex flex-wrap gap-2">
                    {TAG_COLOUR_OPTIONS.map((c) => {
                      const currentHex = tagColourHex(editTag?.color)
                      const isSelected = currentHex.toLowerCase() === c.hex.toLowerCase()
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className="h-6 w-6 rounded-full border-2 transition-all hover:scale-110"
                          title={c.hex}
                          style={{
                            backgroundColor: c.hex,
                            borderColor: isSelected ? "#ffffff" : "transparent",
                            outline: isSelected ? `2px solid ${c.hex}` : "none",
                            outlineOffset: "1px",
                          }}
                          onClick={() => setEditTag((p: Partial<Tag> | null) => ({ ...p, color: c.hex }))}
                        />
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Matching algorithm</Label>
                  <Select
                    value={String(editTag?.matching_algorithm ?? 6)}
                    onValueChange={(v) => setEditTag((p: Partial<Tag> | null) => ({ ...p, matching_algorithm: Number(v) }))}
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

                {(editTag?.matching_algorithm ?? 6) !== 6 && (editTag?.matching_algorithm ?? 6) !== 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="tag-match">Match pattern</Label>
                    <Input
                      id="tag-match"
                      value={editTag?.match ?? ""}
                      onChange={(e) => setEditTag((p: Partial<Tag> | null) => ({ ...p, match: e.target.value }))}
                      placeholder="Pattern to match"
                    />
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Switch
                    id="tag-inbox"
                    checked={editTag?.is_inbox_tag ?? false}
                    onCheckedChange={(v) => setEditTag((p: Partial<Tag> | null) => ({ ...p, is_inbox_tag: v }))}
                  />
                  <Label htmlFor="tag-inbox">Inbox tag</Label>
                </div>
              </div>
            </DraggableDialogBody>
            <DraggableDialogFooter>
              <Button variant="outline" onClick={() => setEditTag(null)}>Cancel</Button>
              <Button onClick={() => void handleSave()} disabled={saving || !editTag?.name?.trim()}>
                {saving ? "Saving…" : isNew ? "Create" : "Save"}
              </Button>
            </DraggableDialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>
      </PermissionGate>

      {/* Delete Confirmation */}
      <CanDelete type="tag">
        <AlertDialog open={deleteId !== null} onOpenChange={(o: boolean) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete tag?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the tag from all documents. This action cannot be undone.
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
