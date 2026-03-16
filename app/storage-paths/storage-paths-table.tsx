"use client"

import * as React from "react"
import { CanCreate } from "@/components/permissions/can-create"
import { CanChange } from "@/components/permissions/can-change"
import { CanDelete } from "@/components/permissions/can-delete"
import { PermissionGate } from "@/components/permissions/permission-gate"
import { usePermissions } from "@/hooks/use-permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import { toast } from "sonner"
import { useAsyncAction } from "@/hooks/use-async-action"
import {
  createStoragePath, updateStoragePath, deleteStoragePath,
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

type StoragePath = {
  id: number
  name: string
  path: string
  matching_algorithm: number
  match: string
  is_insensitive: boolean
  document_count?: number
}

const emptyItem = (): Partial<StoragePath> => ({
  name: "",
  path: "",
  matching_algorithm: 6,
  match: "",
  is_insensitive: false,
})

export function StoragePathsTable({ initialItems }: { initialItems: StoragePath[] }) {
  const { can } = usePermissions()
  const [items, setItems] = React.useState<StoragePath[]>(initialItems)
  const [search, setSearch] = React.useState("")
  const [editing, setEditing] = React.useState<Partial<StoragePath> | null>(null)
  const [isNew, setIsNew] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const filtered = items.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.path.toLowerCase().includes(search.toLowerCase())
  )

  const { pending: saving, run: saveStoragePath } = useAsyncAction({
    action: async () => {
      if (!editing?.name?.trim()) {
        throw new Error("Storage path name is required")
      }

      if (isNew) {
        const created = await createStoragePath({
          name: editing.name,
          path: editing.path ?? "",
          matching_algorithm: editing.matching_algorithm ?? 6,
          match: editing.match ?? "",
          is_insensitive: editing.is_insensitive ?? false,
        })
        setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success(`Storage path "${created.name}" created`)
        return
      }

      const updated = await updateStoragePath(editing.id!, {
        name: editing.name,
        path: editing.path,
        matching_algorithm: editing.matching_algorithm,
        match: editing.match,
        is_insensitive: editing.is_insensitive,
      })
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      toast.success(`Storage path "${updated.name}" updated`)
    },
    errorMessage: "Failed to save",
  })

  const { pending: deleting, run: removeStoragePath } = useAsyncAction({
    action: async (id: number) => {
      await deleteStoragePath(id)
      return id
    },
    errorMessage: "Failed to delete",
  })

  const openCreate = () => { setIsNew(true); setEditing(emptyItem()) }
  const openEdit = (item: StoragePath) => { setIsNew(false); setEditing({ ...item }) }

  const handleSave = async () => {
    try {
      await saveStoragePath()
      setEditing(null)
    } catch {
      // Error toast is handled by useAsyncAction.
    }
  }

  const handleDelete = async () => {
    if (deleteId == null) return
    try {
      const id = await removeStoragePath(deleteId)
      setItems((prev) => prev.filter((item) => item.id !== id))
      toast.success("Storage path deleted")
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
          <Input placeholder="Search storage paths…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <CanCreate type="storagePath">
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />Create Storage Path
          </Button>
        </CanCreate>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Path template</TableHead>
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
                  {search ? "No storage paths match your search." : "No storage paths yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono max-w-[250px] truncate" title={item.path}>
                    {item.path || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {MATCHING_ALGORITHMS.find((a) => a.id === item.matching_algorithm)?.label ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono max-w-[200px] truncate">
                    {item.match || "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {item.document_count ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <CanChange type="storagePath">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </CanChange>
                      <CanDelete type="storagePath">
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

      <p className="text-sm text-muted-foreground">{filtered.length} of {items.length} storage paths</p>

      <PermissionGate allowed={editing !== null && can(isNew ? "create" : "change", "storagePath")}>
        <Dialog open={editing !== null} onOpenChange={(o: boolean) => !o && setEditing(null)}>
          <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isNew ? "Create Storage Path" : "Edit Storage Path"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp-name">Name</Label>
              <Input id="sp-name" value={editing?.name ?? ""} onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))} placeholder="Storage path name" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-path">Path template</Label>
              <Input id="sp-path" value={editing?.path ?? ""} onChange={(e) => setEditing((p) => ({ ...p, path: e.target.value }))} placeholder="e.g. {correspondent}/{title}" className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">
                Variables: {"{correspondent}"}, {"{document_type}"}, {"{title}"}, {"{created}"}, {"{created_year}"}, {"{created_month}"}, {"{created_day}"}, {"{asn}"}, {"{tags}"}, {"{tag_list}"}
              </p>
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
                <Label htmlFor="sp-match">Match pattern</Label>
                <Input id="sp-match" value={editing?.match ?? ""} onChange={(e) => setEditing((p) => ({ ...p, match: e.target.value }))} placeholder="Pattern to match" />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch id="sp-insensitive" checked={editing?.is_insensitive ?? false} onCheckedChange={(v) => setEditing((p) => ({ ...p, is_insensitive: v }))} />
              <Label htmlFor="sp-insensitive">Case insensitive</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={saving || !editing?.name?.trim()}>
              {saving ? "Saving…" : isNew ? "Create" : "Save"}
            </Button>
          </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGate>

      <CanDelete type="storagePath">
        <AlertDialog open={deleteId !== null} onOpenChange={(o: boolean) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete storage path?</AlertDialogTitle>
              <AlertDialogDescription>This will remove the storage path from all documents. This cannot be undone.</AlertDialogDescription>
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
