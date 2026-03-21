"use client"

import * as React from "react"
import Link from "next/link"
import { Copy, ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { CanCreate } from "@/components/permissions/can-create"
import { HasObjectPermission } from "@/components/permissions/has-object-permission"
import { useAsyncAction } from "@/hooks/use-async-action"
import { toErrorMessage } from "@/lib/errors"
import type { PermissionedObject } from "@/lib/permissions"
import {
  updateSavedViewMeta,
  deleteSavedViewManagement,
} from "@/lib/management-actions"
import {
  createSavedView,
  patchSavedView,
} from "@/app/documents/saved-view-actions"
import {
  SavedViewEditor,
  type SavedViewEditorValue,
} from "@/components/saved-views/saved-view-editor"
import type {
  SavedViewRule,
  SavedViewRuleEditorLookups,
} from "@/components/saved-views/filter-rule-editor"
import type { DocumentDisplayMode } from "@/app/documents/display-mode"

type SavedView = {
  id: number
  name: string
  owner?: number | null
  permissions?: PermissionedObject["permissions"]
  user_can_change?: boolean
  show_on_dashboard: boolean
  show_in_sidebar: boolean
  sort_field: string
  sort_reverse: boolean
  filter_rules: SavedViewRule[]
  page_size: number | null
  display_mode: DocumentDisplayMode | null
  display_fields: string[] | null
}

type LookupOption = { id: number; name: string }
type UserOption = { id: number; username?: string; first_name?: string; last_name?: string }
type CustomFieldOption = { id: number; name: string }

const SORT_FIELD_LABELS: Record<string, string> = {
  created: "Created",
  added: "Added",
  modified: "Modified",
  title: "Title",
  correspondent__name: "Correspondent",
  archive_serial_number: "ASN",
}

const emptyView = (): SavedViewEditorValue => ({
  name: "",
  show_on_dashboard: false,
  show_in_sidebar: false,
  sort_field: "created",
  sort_reverse: true,
  filter_rules: [],
  page_size: null,
  display_mode: null,
  display_fields: [],
})

function toEditorValue(view: SavedView): SavedViewEditorValue {
  return {
    id: view.id,
    name: view.name,
    show_on_dashboard: view.show_on_dashboard,
    show_in_sidebar: view.show_in_sidebar,
    sort_field: view.sort_field ?? "created",
    sort_reverse: view.sort_reverse ?? true,
    filter_rules: view.filter_rules ?? [],
    page_size: view.page_size ?? null,
    display_mode: view.display_mode ?? null,
    display_fields: view.display_fields ?? [],
  }
}

export function SavedViewsTable({
  initialViews,
  correspondents,
  documentTypes,
  storagePaths,
  tags,
  users,
  customFields,
}: {
  initialViews: SavedView[]
  correspondents: LookupOption[]
  documentTypes: LookupOption[]
  storagePaths: LookupOption[]
  tags: LookupOption[]
  users: UserOption[]
  customFields: CustomFieldOption[]
}) {
  const [views, setViews] = React.useState<SavedView[]>(initialViews)
  const [search, setSearch] = React.useState("")
  const [editing, setEditing] = React.useState<SavedViewEditorValue | null>(null)
  const [isNew, setIsNew] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const lookups = React.useMemo<SavedViewRuleEditorLookups>(
    () => ({
      correspondents,
      documentTypes,
      storagePaths,
      tags,
      users,
      customFields,
    }),
    [correspondents, documentTypes, storagePaths, tags, users, customFields]
  )

  const filtered = views.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  )

  const { pending: saving, run: saveView } = useAsyncAction({
    action: async () => {
      if (!editing?.name.trim()) {
        throw new Error("View name is required")
      }

      if (isNew) {
        const created = await createSavedView({
          name: editing.name,
          filter_rules: editing.filter_rules,
          sort_field: editing.sort_field ?? "created",
          sort_reverse: editing.sort_reverse ?? true,
          page_size: editing.page_size ?? undefined,
          display_mode: editing.display_mode ?? undefined,
          display_fields: editing.display_fields,
          show_on_dashboard: editing.show_on_dashboard ?? false,
          show_in_sidebar: editing.show_in_sidebar ?? false,
        })

        setViews((prev) => [
          ...prev,
          { ...created, ...editing, id: created.id } as SavedView,
        ])
        toast.success(`View "${created.name}" created`)
        return
      }

      await patchSavedView(editing.id!, {
        name: editing.name,
        show_on_dashboard: editing.show_on_dashboard,
        show_in_sidebar: editing.show_in_sidebar,
        page_size: editing.page_size ?? undefined,
        sort_field: editing.sort_field,
        sort_reverse: editing.sort_reverse,
        display_mode: editing.display_mode,
        display_fields: editing.display_fields,
        filter_rules: editing.filter_rules,
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
    setEditing(toEditorValue(view))
  }

  const duplicateView = async (source: SavedViewEditorValue) => {
    const duplicated = await createSavedView({
      name: `${source.name} Copy`,
      filter_rules: source.filter_rules,
      sort_field: source.sort_field,
      sort_reverse: source.sort_reverse,
      page_size: source.page_size ?? undefined,
      display_mode: source.display_mode ?? undefined,
      display_fields: source.display_fields,
      show_on_dashboard: false,
      show_in_sidebar: false,
    })

    const duplicatedView = duplicated as SavedView
    setViews((prev) => [...prev, duplicatedView])
    toast.success(`View "${duplicatedView.name}" created`)
    setEditing(toEditorValue(duplicatedView))
    setIsNew(false)
  }

  const handleDuplicate = async () => {
    if (!editing?.name.trim()) return

    try {
      await duplicateView(editing)
    } catch (error) {
      toast.error("Failed to duplicate", {
        description: toErrorMessage(error),
      })
    }
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
        <CanCreate type="savedView">
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create View
          </Button>
        </CanCreate>
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
                    <HasObjectPermission action="change" object={view} type="savedView">
                      <Switch
                        checked={view.show_on_dashboard}
                        onCheckedChange={() => handleToggle(view, "show_on_dashboard")}
                        className="mx-auto"
                      />
                    </HasObjectPermission>
                  </TableCell>
                  <TableCell className="text-center">
                    <HasObjectPermission action="change" object={view} type="savedView">
                      <Switch
                        checked={view.show_in_sidebar}
                        onCheckedChange={() => handleToggle(view, "show_in_sidebar")}
                        className="mx-auto"
                      />
                    </HasObjectPermission>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {view.filter_rules?.length ?? 0} rules
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {view.sort_reverse ? "↓" : "↑"}{" "}
                    {SORT_FIELD_LABELS[view.sort_field] ?? view.sort_field}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <CanCreate type="savedView">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => void duplicateView(toEditorValue(view))}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </CanCreate>
                      <HasObjectPermission action="change" object={view} type="savedView">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(view)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </HasObjectPermission>
                      <HasObjectPermission action="delete" object={view} type="savedView">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(view.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </HasObjectPermission>
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

      <SavedViewEditor
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        value={editing}
        onChange={setEditing}
        onSave={handleSave}
        onDuplicate={!isNew ? handleDuplicate : undefined}
        saving={saving}
        isNew={isNew}
        lookups={lookups}
      />

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
