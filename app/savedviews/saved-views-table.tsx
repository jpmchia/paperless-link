"use client"

import * as React from "react"
import Link from "next/link"
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
import { Plus, Pencil, Trash2, Search, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { useAsyncAction } from "@/hooks/use-async-action"
import { toErrorMessage } from "@/lib/errors"
import {
  updateSavedViewMeta,
  deleteSavedViewManagement,
} from "@/lib/management-actions"
import { createSavedView } from "@/app/documents/saved-view-actions"

const PAGE_SIZES = [10, 25, 50, 100, 250]

type SavedView = {
  id: number
  name: string
  show_on_dashboard: boolean
  show_in_sidebar: boolean
  sort_field: string
  sort_reverse: boolean
  filter_rules: unknown[]
  page_size: number | null
  display_mode: string | null
  display_fields: string[] | null
}

const emptyView = (): Partial<SavedView> => ({
  name: "",
  show_on_dashboard: false,
  show_in_sidebar: false,
  sort_field: "created",
  sort_reverse: true,
  page_size: null,
})

const SORT_FIELDS = [
  { value: "created", label: "Created" },
  { value: "added", label: "Added" },
  { value: "modified", label: "Modified" },
  { value: "title", label: "Title" },
  { value: "correspondent__name", label: "Correspondent" },
  { value: "archive_serial_number", label: "ASN" },
]

export function SavedViewsTable({ initialViews }: { initialViews: SavedView[] }) {
  const [views, setViews] = React.useState<SavedView[]>(initialViews)
  const [search, setSearch] = React.useState("")
  const [editing, setEditing] = React.useState<Partial<SavedView> | null>(null)
  const [isNew, setIsNew] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const filtered = views.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  )

  const { pending: saving, run: saveView } = useAsyncAction({
    action: async () => {
      if (!editing?.name?.trim()) {
        throw new Error("View name is required")
      }

      if (isNew) {
        const created = await createSavedView({
          name: editing.name,
          filter_rules: [],
          sort_field: editing.sort_field ?? "created",
          sort_reverse: editing.sort_reverse ?? true,
          page_size: editing.page_size ?? undefined,
        })

        if (editing.show_on_dashboard || editing.show_in_sidebar) {
          await updateSavedViewMeta(created.id, {
            show_on_dashboard: editing.show_on_dashboard,
            show_in_sidebar: editing.show_in_sidebar,
          })
        }

        setViews((prev) => [
          ...prev,
          { ...created, ...editing, id: created.id } as SavedView,
        ])
        toast.success(`View "${created.name}" created`)
        return
      }

      await updateSavedViewMeta(editing.id!, {
        name: editing.name,
        show_on_dashboard: editing.show_on_dashboard,
        show_in_sidebar: editing.show_in_sidebar,
        page_size: editing.page_size ?? undefined,
      })
      setViews((prev) =>
        prev.map((view) =>
          view.id === editing.id ? ({ ...view, ...editing } as SavedView) : view
        )
      )
      toast.success(`View "${editing.name}" updated`)
    },
    errorMessage: "Failed to save",
  })

  const { pending: deleting, run: deleteView } = useAsyncAction({
    action: async (id: number) => {
      await deleteSavedViewManagement(id)
      return id
    },
    errorMessage: "Failed to delete",
  })

  const openCreate = () => {
    setIsNew(true)
    setEditing(emptyView())
  }

  const openEdit = (view: SavedView) => {
    setIsNew(false)
    setEditing({ ...view })
  }

  const handleSave = async () => {
    try {
      await saveView()
      setEditing(null)
    } catch {
      // Error toast is handled by useAsyncAction.
    }
  }

  const handleDelete = async () => {
    if (deleteId == null) return
    try {
      const id = await deleteView(deleteId)
      setViews((prev) => prev.filter((view) => view.id !== id))
      toast.success("Saved view deleted")
    } catch {
      // Error toast is handled by useAsyncAction.
    } finally {
      setDeleteId(null)
    }
  }

  const handleToggle = async (view: SavedView, field: "show_on_dashboard" | "show_in_sidebar") => {
    const updated = { ...view, [field]: !view[field] }
    setViews((prev) => prev.map((v) => (v.id === view.id ? updated : v)))
    try {
      await updateSavedViewMeta(view.id, { [field]: updated[field] })
    } catch (error) {
      // Rollback on error
      setViews((prev) => prev.map((v) => (v.id === view.id ? view : v)))
      toast.error("Failed to update view", {
        description: toErrorMessage(error),
      })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search views…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create View
        </Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-center">Dashboard</TableHead>
              <TableHead className="text-center">Sidebar</TableHead>
              <TableHead>Filters</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                  {search ? "No views match your search." : "No saved views yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((view) => (
                <TableRow key={view.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/view/${view.id}`}
                      className="hover:text-primary flex items-center gap-1.5 group"
                    >
                      {view.name}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={view.show_on_dashboard}
                      onCheckedChange={() => handleToggle(view, "show_on_dashboard")}
                      className="mx-auto"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={view.show_in_sidebar}
                      onCheckedChange={() => handleToggle(view, "show_in_sidebar")}
                      className="mx-auto"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {view.filter_rules?.length ?? 0} rules
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {view.sort_reverse ? "↓" : "↑"}{" "}
                    {SORT_FIELDS.find((f) => f.value === view.sort_field)?.label ?? view.sort_field}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(view)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(view.id)}
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
        {filtered.length} of {views.length} saved views
      </p>

      {/* Edit / Create Dialog */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isNew ? "Create Saved View" : `Edit "${editing?.name}"`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sv-name">Name</Label>
              <Input
                id="sv-name"
                value={editing?.name ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                placeholder="View name"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Show on dashboard</p>
                <p className="text-xs text-muted-foreground">Appears as a widget on the dashboard</p>
              </div>
              <Switch
                checked={editing?.show_on_dashboard ?? false}
                onCheckedChange={(v) => setEditing((p) => ({ ...p, show_on_dashboard: v }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Show in sidebar</p>
                <p className="text-xs text-muted-foreground">Pinned in the app sidebar for quick access</p>
              </div>
              <Switch
                checked={editing?.show_in_sidebar ?? false}
                onCheckedChange={(v) => setEditing((p) => ({ ...p, show_in_sidebar: v }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sort by</Label>
                <Select
                  value={editing?.sort_field ?? "created"}
                  onValueChange={(v) => setEditing((p) => ({ ...p, sort_field: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Direction</Label>
                <Select
                  value={editing?.sort_reverse ? "desc" : "asc"}
                  onValueChange={(v) => setEditing((p) => ({ ...p, sort_reverse: v === "desc" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest first</SelectItem>
                    <SelectItem value="asc">Oldest first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Page size</Label>
              <Select
                value={editing?.page_size != null ? String(editing.page_size) : "_default"}
                onValueChange={(v) => setEditing((p) => ({ ...p, page_size: v === "_default" ? null : Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_default">Default</SelectItem>
                  {PAGE_SIZES.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s} per page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved view?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the saved view. Documents will not be affected.
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
