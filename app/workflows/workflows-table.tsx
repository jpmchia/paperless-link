"use client"

import * as React from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { KeyboardSensor } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog as DraggableDialog,
  DialogBody as DraggableDialogBody,
  DialogContent as DraggableDialogContent,
  DialogDescription as DraggableDialogDescription,
  DialogFooter as DraggableDialogFooter,
  DialogHeader as DraggableDialogHeader,
  DialogTitle as DraggableDialogTitle,
} from "@/components/draggable-dialog"
import { HasObjectPermission } from "@/components/permissions/has-object-permission"
import { Trash2, Search, GripVertical, Pencil, Plus, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { toErrorMessage } from "@/lib/errors"
import { deleteJson, patchJson, postJson } from "@/lib/paperless-client"
import type { PermissionedObject } from "@/lib/permissions"

interface Workflow extends PermissionedObject {
  id: number
  name: string
  order: number
  enabled: boolean
  triggers?: unknown[]
  actions?: unknown[]
}

interface WorkflowLookups {
  tags: Array<{ id: number; name: string }>
  correspondents: Array<{ id: number; name: string }>
  documentTypes: Array<{ id: number; name: string }>
  storagePaths: Array<{ id: number; name: string }>
  customFields: Array<{ id: number; name: string }>
  users: Array<{ id: number; username?: string }>
  groups: Array<{ id: number; name: string }>
}

type WorkflowDraft = {
  name: string
  enabled: boolean
  order: string
  triggersJson: string
  actionsJson: string
}

function createWorkflowDraft(workflow?: Workflow | null): WorkflowDraft {
  return {
    name: workflow?.name ?? "",
    enabled: workflow?.enabled ?? true,
    order: workflow?.order != null ? String(workflow.order) : "",
    triggersJson: JSON.stringify(workflow?.triggers ?? [{ type: 2 }], null, 2),
    actionsJson: JSON.stringify(workflow?.actions ?? [{ type: 1 }], null, 2),
  }
}

function SortableRow({
  wf,
  onToggle,
  onDelete,
  onEdit,
  isDragDisabled,
}: {
  wf: Workflow
  onToggle: (wf: Workflow) => void
  onDelete: (id: number) => void
  onEdit: (wf: Workflow) => void
  isDragDisabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: wf.id, disabled: isDragDisabled })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8 px-2">
        {!isDragDisabled && (
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5 rounded"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </TableCell>
      <TableCell className="font-medium">{wf.name}</TableCell>
      <TableCell className="text-center text-muted-foreground text-xs">{wf.order}</TableCell>
      <TableCell className="text-center">
        <HasObjectPermission action="change" object={wf} type="workflow">
          <Switch
            checked={wf.enabled}
            onCheckedChange={() => onToggle(wf)}
            className="mx-auto"
          />
        </HasObjectPermission>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">
          {wf.triggers?.length ?? 0} trigger{(wf.triggers?.length ?? 0) !== 1 ? "s" : ""}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {wf.actions?.length ?? 0} action{(wf.actions?.length ?? 0) !== 1 ? "s" : ""}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(wf)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <HasObjectPermission action="delete" object={wf} type="workflow">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(wf.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </HasObjectPermission>
      </TableCell>
    </TableRow>
  )
}

export function WorkflowsTable({
  initialItems,
  lookups,
}: {
  initialItems: Workflow[]
  lookups: WorkflowLookups
}) {
  const [items, setItems] = React.useState<Workflow[]>(
    [...initialItems].sort((a, b) => a.order - b.order)
  )
  const [search, setSearch] = React.useState("")
  const [deleteId, setDeleteId] = React.useState<number | null>(null)
  const [workflowDialogOpen, setWorkflowDialogOpen] = React.useState(false)
  const [editingWorkflow, setEditingWorkflow] = React.useState<Workflow | null>(null)
  const [workflowDraft, setWorkflowDraft] = React.useState<WorkflowDraft>(createWorkflowDraft())
  const [savingWorkflow, setSavingWorkflow] = React.useState(false)

  const isSearching = search.trim().length > 0
  const filtered = isSearching
    ? items.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
    : items

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const toggleEnabled = async (wf: Workflow) => {
    try {
      await patchJson<Workflow>(`/api/proxy/workflows/${wf.id}/`, {
        enabled: !wf.enabled,
      })
      setItems((prev) =>
        prev.map((w) => (w.id === wf.id ? { ...w, enabled: !w.enabled } : w))
      )
      toast.success(`Workflow "${wf.name}" ${wf.enabled ? "disabled" : "enabled"}`)
    } catch (error) {
      toast.error("Failed to update workflow", {
        description: toErrorMessage(error),
      })
    }
  }

  const openCreateWorkflowDialog = React.useCallback(() => {
    setEditingWorkflow(null)
    setWorkflowDraft(createWorkflowDraft())
    setWorkflowDialogOpen(true)
  }, [])

  const openEditWorkflowDialog = React.useCallback((workflow: Workflow) => {
    setEditingWorkflow(workflow)
    setWorkflowDraft(createWorkflowDraft(workflow))
    setWorkflowDialogOpen(true)
  }, [])

  const handleWorkflowDraftChange = React.useCallback(
    <K extends keyof WorkflowDraft>(key: K, value: WorkflowDraft[K]) => {
      setWorkflowDraft((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleSaveWorkflow = async () => {
    if (!workflowDraft.name.trim()) {
      toast.error("Workflow name is required")
      return
    }

    let triggers: unknown[]
    let actions: unknown[]
    try {
      const parsedTriggers = JSON.parse(workflowDraft.triggersJson)
      const parsedActions = JSON.parse(workflowDraft.actionsJson)
      if (!Array.isArray(parsedTriggers) || !Array.isArray(parsedActions)) {
        throw new Error("Triggers and actions must both be JSON arrays")
      }
      triggers = parsedTriggers
      actions = parsedActions
    } catch (error) {
      toast.error("Workflow JSON is invalid", {
        description: toErrorMessage(error),
      })
      return
    }

    setSavingWorkflow(true)
    try {
      const payload = {
        name: workflowDraft.name.trim(),
        enabled: workflowDraft.enabled,
        order: workflowDraft.order ? Number(workflowDraft.order) : items.length + 1,
        triggers,
        actions,
      }

      const saved = editingWorkflow
        ? await patchJson<Workflow>(`/api/proxy/workflows/${editingWorkflow.id}/`, payload)
        : await postJson<Workflow>("/api/proxy/workflows/", payload)

      setItems((prev) => {
        const next = editingWorkflow
          ? prev.map((workflow) => (workflow.id === saved.id ? saved : workflow))
          : [...prev, saved]
        return [...next].sort((a, b) => a.order - b.order)
      })
      toast.success(`Workflow ${editingWorkflow ? "updated" : "created"}`)
      setWorkflowDialogOpen(false)
    } catch (error) {
      toast.error(`Failed to ${editingWorkflow ? "update" : "create"} workflow`, {
        description: toErrorMessage(error),
      })
    } finally {
      setSavingWorkflow(false)
    }
  }

  const handleDelete = async () => {
    if (deleteId == null) return
    try {
      await deleteJson<void>(`/api/proxy/workflows/${deleteId}/`)
      setItems((prev) => prev.filter((w) => w.id !== deleteId))
      toast.success("Workflow deleted")
    } catch (error) {
      toast.error("Failed to delete", { description: toErrorMessage(error) })
    } finally {
      setDeleteId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = items.findIndex((w) => w.id === active.id)
    const newIdx = items.findIndex((w) => w.id === over.id)
    const reordered = arrayMove(items, oldIdx, newIdx)

    // Assign new sequential order values (1-based)
    const updated = reordered.map((w, i) => ({ ...w, order: i + 1 }))
    setItems(updated)

    // Persist changes: only PATCH items whose order actually changed
    const changed = updated.filter((w, i) => w.order !== items[i]?.order)
    try {
      await Promise.all(
        changed.map((workflow) =>
          patchJson<Workflow>(`/api/proxy/workflows/${workflow.id}/`, {
            order: workflow.order,
          })
        )
      )
      toast.success("Workflow order saved")
    } catch (error) {
      toast.error("Failed to save order", {
        description: toErrorMessage(error),
      })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search workflows…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {items.length} workflows
            {!isSearching && <span className="ml-2 text-xs opacity-60">· drag to reorder</span>}
          </p>
          <Button size="sm" className="h-8 gap-1.5" onClick={openCreateWorkflowDialog}>
            <Plus className="h-3.5 w-3.5" />
            New workflow
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 px-2" />
              <TableHead>Name</TableHead>
              <TableHead className="w-20 text-center">Order</TableHead>
              <TableHead className="w-20 text-center">Enabled</TableHead>
              <TableHead className="w-28">Triggers</TableHead>
              <TableHead className="w-28">Actions</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((w) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                      {search ? "No workflows match your search." : "No workflows configured."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((wf) => (
                    <SortableRow
                      key={wf.id}
                      wf={wf}
                      onToggle={toggleEnabled}
                      onDelete={setDeleteId}
                      onEdit={openEditWorkflowDialog}
                      isDragDisabled={isSearching}
                    />
                  ))
                )}
              </TableBody>
            </SortableContext>
          </DndContext>
        </Table>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(o: boolean) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DraggableDialog open={workflowDialogOpen} onOpenChange={setWorkflowDialogOpen}>
        <DraggableDialogContent initialWidth={1120} initialHeight={900} maxWidth={1320} maxHeight={1040}>
          <DraggableDialogHeader>
            <DraggableDialogTitle>{editingWorkflow ? "Edit workflow" : "New workflow"}</DraggableDialogTitle>
            <DraggableDialogDescription>
              Define the workflow basics here and edit triggers/actions as JSON using the Paperless API shape.
            </DraggableDialogDescription>
          </DraggableDialogHeader>
          <DraggableDialogBody>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={workflowDraft.name} onChange={(e) => handleWorkflowDraftChange("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input value={workflowDraft.order} onChange={(e) => handleWorkflowDraftChange("order", e.target.value)} inputMode="numeric" />
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Enabled</p>
                <p className="text-xs text-muted-foreground">Disabled workflows remain saved but do not run.</p>
              </div>
              <Switch checked={workflowDraft.enabled} onCheckedChange={(checked) => handleWorkflowDraftChange("enabled", checked)} />
            </div>
            <div className="space-y-2">
              <Label>Triggers JSON</Label>
              <Textarea className="min-h-72 font-mono text-xs" value={workflowDraft.triggersJson} onChange={(e) => handleWorkflowDraftChange("triggersJson", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Actions JSON</Label>
              <Textarea className="min-h-72 font-mono text-xs" value={workflowDraft.actionsJson} onChange={(e) => handleWorkflowDraftChange("actionsJson", e.target.value)} />
            </div>
            <div className="md:col-span-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Available lookup ids</p>
              <p className="mt-2">Tags: {lookups.tags.map((tag) => `${tag.id}:${tag.name}`).join(", ") || "none"}</p>
              <p>Correspondents: {lookups.correspondents.map((item) => `${item.id}:${item.name}`).join(", ") || "none"}</p>
              <p>Document types: {lookups.documentTypes.map((item) => `${item.id}:${item.name}`).join(", ") || "none"}</p>
              <p>Storage paths: {lookups.storagePaths.map((item) => `${item.id}:${item.name}`).join(", ") || "none"}</p>
              <p>Custom fields: {lookups.customFields.map((item) => `${item.id}:${item.name}`).join(", ") || "none"}</p>
              <p>Users: {lookups.users.map((item) => `${item.id}:${item.username ?? "user"}`).join(", ") || "none"}</p>
              <p>Groups: {lookups.groups.map((item) => `${item.id}:${item.name}`).join(", ") || "none"}</p>
            </div>
          </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button variant="outline" onClick={() => setWorkflowDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSaveWorkflow()} disabled={savingWorkflow}>
              {savingWorkflow ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingWorkflow ? "Save workflow" : "Create workflow"}
            </Button>
          </DraggableDialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>
    </>
  )
}
