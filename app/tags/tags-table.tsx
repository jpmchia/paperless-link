"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

export function TagsTable({ initialTags }: { initialTags: Tag[] }) {
  const [tags, setTags] = React.useState<Tag[]>(initialTags)
  const [search, setSearch] = React.useState("")
  const [editTag, setEditTag] = React.useState<Partial<Tag> | null>(null)
  const [isNew, setIsNew] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const filtered = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

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

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tags…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create Tag
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Name</TableHead>
              <TableHead>Matching</TableHead>
              <TableHead>Match pattern</TableHead>
              <TableHead className="text-right">Docs</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
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
              filtered.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell>
                    <span
                      className="inline-block w-4 h-4 rounded-full border border-black/10"
                      style={{ backgroundColor: tagColourHex(tag.color) }}
                    />
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
                  <TableCell className="text-muted-foreground text-sm font-mono max-w-[200px] truncate">
                    {tag.match || <span className="opacity-30">—</span>}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {tag.document_count ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tag)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(tag.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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

      {/* Edit / Create Dialog */}
      <Dialog open={editTag !== null} onOpenChange={(o: boolean) => !o && setEditTag(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isNew ? "Create Tag" : "Edit Tag"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
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

            {/* Colour preview */}
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
                  // Compare by hex — the API returns hex strings
                  const currentHex = tagColourHex(editTag?.color)
                  const isSelected = currentHex.toLowerCase() === c.hex.toLowerCase()
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTag(null)}>Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={saving || !editTag?.name?.trim()}>
              {saving ? "Saving…" : isNew ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
    </>
  )
}
