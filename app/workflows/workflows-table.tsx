"use client"

import * as React from "react"
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Copy, GripVertical, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog as DraggableDialog,
  DialogBody as DraggableDialogBody,
  DialogDescription as DraggableDialogDescription,
  DialogFooter as DraggableDialogFooter,
  DialogHeader as DraggableDialogHeader,
  DialogTitle as DraggableDialogTitle,
  LargeEditorDialogContent,
} from "@/components/draggable-dialog"
import { Input } from "@/components/ui/input"
import { HasObjectPermission } from "@/components/permissions/has-object-permission"
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
import { WorkflowEditor } from "@/components/workflows/editor/workflow-editor"
import {
  createWorkflowDraft,
  DocumentSource,
  ScheduleDateField,
  type WorkflowAction,
  WorkflowActionType,
  type WorkflowDraft,
  type WorkflowLookups,
  type WorkflowRecord,
  type WorkflowTrigger,
  WorkflowTriggerType,
} from "@/components/workflows/editor/types"
import { CanCreate } from "@/components/permissions/can-create"
import { usePermission } from "@/hooks/use-permissions"
import { deleteJson, patchJson, postJson } from "@/lib/paperless-client"
import type { PermissionedObject } from "@/lib/permissions"
import { toErrorMessage } from "@/lib/errors"

interface Workflow extends WorkflowRecord, PermissionedObject {}

function sanitizeString(value?: string | null) {
  const trimmed = value?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : null
}

function sanitizeObjectTextarea(value: Record<string, unknown> | null | undefined, label: string) {
  if (!value || Object.keys(value).length === 0) return null
  if ("__invalid_json__" in value) {
    throw new Error(`${label} contains invalid JSON`)
  }
  return value
}

function assertNever(value: never): never {
  throw new Error(`Unhandled workflow action type: ${String(value)}`)
}

function sanitizeTrigger(trigger: WorkflowTrigger): WorkflowTrigger {
  const next: WorkflowTrigger = {
    ...(trigger.id != null ? { id: trigger.id } : {}),
    type: trigger.type,
  }

  if (trigger.type === WorkflowTriggerType.Consumption) {
    next.sources = trigger.sources?.length
      ? trigger.sources
      : [DocumentSource.ConsumeFolder, DocumentSource.ApiUpload, DocumentSource.MailFetch]
    next.filter_filename = sanitizeString(trigger.filter_filename)
    next.filter_path = sanitizeString(trigger.filter_path)
    if (trigger.filter_mailrule != null) next.filter_mailrule = trigger.filter_mailrule
  } else {
    next.filter_filename = sanitizeString(trigger.filter_filename)
    next.matching_algorithm = trigger.matching_algorithm ?? 0
    if ((trigger.matching_algorithm ?? 0) !== 0) {
      next.match = sanitizeString(trigger.match)
      next.is_insensitive = Boolean(trigger.is_insensitive)
    }

    if (trigger.filter_has_tags?.length) next.filter_has_tags = trigger.filter_has_tags
    if (trigger.filter_has_all_tags?.length) next.filter_has_all_tags = trigger.filter_has_all_tags
    if (trigger.filter_has_not_tags?.length) next.filter_has_not_tags = trigger.filter_has_not_tags
    if (trigger.filter_has_any_correspondents?.length) next.filter_has_any_correspondents = trigger.filter_has_any_correspondents
    if (trigger.filter_has_not_correspondents?.length) next.filter_has_not_correspondents = trigger.filter_has_not_correspondents
    if (trigger.filter_has_any_document_types?.length) next.filter_has_any_document_types = trigger.filter_has_any_document_types
    if (trigger.filter_has_not_document_types?.length) next.filter_has_not_document_types = trigger.filter_has_not_document_types
    if (trigger.filter_has_any_storage_paths?.length) next.filter_has_any_storage_paths = trigger.filter_has_any_storage_paths
    if (trigger.filter_has_not_storage_paths?.length) next.filter_has_not_storage_paths = trigger.filter_has_not_storage_paths
    if (trigger.filter_has_correspondent != null) next.filter_has_correspondent = trigger.filter_has_correspondent
    if (trigger.filter_has_document_type != null) next.filter_has_document_type = trigger.filter_has_document_type
    if (trigger.filter_has_storage_path != null) next.filter_has_storage_path = trigger.filter_has_storage_path
    next.filter_custom_field_query = sanitizeString(trigger.filter_custom_field_query)

    if (trigger.type === WorkflowTriggerType.Scheduled) {
      next.schedule_offset_days = trigger.schedule_offset_days ?? 0
      next.schedule_date_field = trigger.schedule_date_field ?? ScheduleDateField.Added
      next.schedule_is_recurring = Boolean(trigger.schedule_is_recurring)
      if (trigger.schedule_is_recurring) {
        next.schedule_recurring_interval_days = trigger.schedule_recurring_interval_days ?? 1
      }
      if (trigger.schedule_date_field === "custom_field" && trigger.schedule_date_custom_field != null) {
        next.schedule_date_custom_field = trigger.schedule_date_custom_field
      }
    }
  }

  return next
}

function sanitizeAction(action: WorkflowAction): WorkflowAction {
  const next: WorkflowAction = {
    ...(action.id != null ? { id: action.id } : {}),
    type: action.type,
  }

  switch (action.type) {
    case WorkflowActionType.Assignment:
      next.assign_title = sanitizeString(action.assign_title)
      if (action.assign_tags?.length) next.assign_tags = action.assign_tags
      if (action.assign_document_type != null) next.assign_document_type = action.assign_document_type
      if (action.assign_correspondent != null) next.assign_correspondent = action.assign_correspondent
      if (action.assign_storage_path != null) next.assign_storage_path = action.assign_storage_path
      if (action.assign_owner != null) next.assign_owner = action.assign_owner
      if (action.assign_view_users?.length) next.assign_view_users = action.assign_view_users
      if (action.assign_view_groups?.length) next.assign_view_groups = action.assign_view_groups
      if (action.assign_change_users?.length) next.assign_change_users = action.assign_change_users
      if (action.assign_change_groups?.length) next.assign_change_groups = action.assign_change_groups
      if (action.assign_custom_fields?.length) next.assign_custom_fields = action.assign_custom_fields
      next.assign_custom_fields_values = sanitizeObjectTextarea(action.assign_custom_fields_values ?? null, "Assign custom field values")
      break
    case WorkflowActionType.Removal:
      if (action.remove_tags?.length) next.remove_tags = action.remove_tags
      if (action.remove_document_types?.length) next.remove_document_types = action.remove_document_types
      if (action.remove_correspondents?.length) next.remove_correspondents = action.remove_correspondents
      if (action.remove_storage_paths?.length) next.remove_storage_paths = action.remove_storage_paths
      if (action.remove_owners?.length) next.remove_owners = action.remove_owners
      if (action.remove_view_users?.length) next.remove_view_users = action.remove_view_users
      if (action.remove_view_groups?.length) next.remove_view_groups = action.remove_view_groups
      if (action.remove_change_users?.length) next.remove_change_users = action.remove_change_users
      if (action.remove_change_groups?.length) next.remove_change_groups = action.remove_change_groups
      if (action.remove_custom_fields?.length) next.remove_custom_fields = action.remove_custom_fields
      next.remove_all_tags = Boolean(action.remove_all_tags)
      next.remove_all_document_types = Boolean(action.remove_all_document_types)
      next.remove_all_correspondents = Boolean(action.remove_all_correspondents)
      next.remove_all_storage_paths = Boolean(action.remove_all_storage_paths)
      next.remove_all_owners = Boolean(action.remove_all_owners)
      next.remove_all_permissions = Boolean(action.remove_all_permissions)
      next.remove_all_custom_fields = Boolean(action.remove_all_custom_fields)
      break
    case WorkflowActionType.Email:
      next.email = {
        ...(action.email?.id != null ? { id: action.email.id } : {}),
        to: sanitizeString(action.email?.to),
        subject: sanitizeString(action.email?.subject),
        body: sanitizeString(action.email?.body),
        include_document: Boolean(action.email?.include_document),
      }
      break
    case WorkflowActionType.Webhook:
      next.webhook = {
        ...(action.webhook?.id != null ? { id: action.webhook.id } : {}),
        url: sanitizeString(action.webhook?.url),
        use_params: Boolean(action.webhook?.use_params),
        as_json: Boolean(action.webhook?.as_json),
        params: sanitizeObjectTextarea(action.webhook?.params ?? null, "Webhook params"),
        headers: sanitizeObjectTextarea(action.webhook?.headers ?? null, "Webhook headers"),
        body: sanitizeString(action.webhook?.body),
        include_document: Boolean(action.webhook?.include_document),
      }
      break
    case WorkflowActionType.PasswordRemoval:
      next.passwords = (action.passwords ?? []).map((password) => password.trim()).filter(Boolean)
      break
    case WorkflowActionType.MoveToTrash:
    case WorkflowActionType.RemoteOcr:
      break
    default:
      assertNever(action.type)
  }

  return next
}

export function buildWorkflowPayload(draft: WorkflowDraft, itemsLength: number) {
  return {
    name: draft.name.trim(),
    enabled: draft.enabled,
    order: draft.order ? Number(draft.order) : itemsLength + 1,
    triggers: draft.triggers.map(sanitizeTrigger),
    actions: draft.actions.map(sanitizeAction),
  }
}

export function duplicateWorkflow(workflow: Workflow): WorkflowDraft {
  return {
    ...createWorkflowDraft(workflow),
    id: undefined,
    name: `${workflow.name} (copy)`,
  }
}

function SortableRow({
  wf,
  onCopy,
  onDelete,
  onEdit,
  onToggle,
  isDragDisabled,
}: {
  wf: Workflow
  onCopy: (workflow: Workflow) => void
  onDelete: (id: number) => void
  onEdit: (workflow: Workflow) => void
  onToggle: (workflow: Workflow) => void
  isDragDisabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: wf.id,
    disabled: isDragDisabled,
  })

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8 px-2">
        {!isDragDisabled ? (
          <button className="cursor-grab rounded p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing" {...attributes} {...listeners} aria-label="Drag to reorder">
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
      </TableCell>
      <TableCell className="font-medium">{wf.name}</TableCell>
      <TableCell className="text-center text-xs text-muted-foreground">{wf.order}</TableCell>
      <TableCell className="text-center">
        <HasObjectPermission action="change" object={wf} type="workflow">
          <Switch checked={wf.enabled} onCheckedChange={() => onToggle(wf)} className="mx-auto" />
        </HasObjectPermission>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">
          {wf.triggers?.length ?? 0} trigger{(wf.triggers?.length ?? 0) === 1 ? "" : "s"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {wf.actions?.length ?? 0} action{(wf.actions?.length ?? 0) === 1 ? "" : "s"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <HasObjectPermission action="change" object={wf} type="workflow">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(wf)} aria-label={`Edit ${wf.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </HasObjectPermission>
        <CanCreate type="workflow">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCopy(wf)} aria-label={`Copy ${wf.name}`}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </CanCreate>
        <HasObjectPermission action="delete" object={wf} type="workflow">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(wf.id)} aria-label={`Delete ${wf.name}`}>
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
  remoteOcrConfigured = false,
}: {
  initialItems: Workflow[]
  lookups: WorkflowLookups
  remoteOcrConfigured?: boolean
}) {
  const canChangeWorkflow = usePermission("change", "workflow")
  const [items, setItems] = React.useState<Workflow[]>([...initialItems].sort((a, b) => a.order - b.order))
  const [search, setSearch] = React.useState("")
  const [deleteId, setDeleteId] = React.useState<number | null>(null)
  const [workflowDialogOpen, setWorkflowDialogOpen] = React.useState(false)
  const [editingWorkflow, setEditingWorkflow] = React.useState<Workflow | null>(null)
  const [workflowDraft, setWorkflowDraft] = React.useState<WorkflowDraft>(createWorkflowDraft())
  const [savingWorkflow, setSavingWorkflow] = React.useState(false)

  const isSearching = search.trim().length > 0
  const filtered = isSearching ? items.filter((workflow) => workflow.name.toLowerCase().includes(search.toLowerCase())) : items

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const toggleEnabled = async (workflow: Workflow) => {
    try {
      await patchJson<Workflow>(`/api/proxy/workflows/${workflow.id}/`, { enabled: !workflow.enabled })
      setItems((current) => current.map((item) => (item.id === workflow.id ? { ...item, enabled: !item.enabled } : item)))
      toast.success(`Workflow "${workflow.name}" ${workflow.enabled ? "disabled" : "enabled"}`)
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

  const openDuplicateWorkflowDialog = React.useCallback((workflow: Workflow) => {
    setEditingWorkflow(null)
    setWorkflowDraft(duplicateWorkflow(workflow))
    setWorkflowDialogOpen(true)
  }, [])

  const handleSaveWorkflow = async () => {
    if (!workflowDraft.name.trim()) {
      toast.error("Workflow name is required")
      return
    }

    setSavingWorkflow(true)
    try {
      const payload = buildWorkflowPayload(workflowDraft, items.length)
      const saved = editingWorkflow
        ? await patchJson<Workflow>(`/api/proxy/workflows/${editingWorkflow.id}/`, payload)
        : await postJson<Workflow>("/api/proxy/workflows/", payload)

      setItems((current) => {
        const next = editingWorkflow
          ? current.map((workflow) => (workflow.id === saved.id ? saved : workflow))
          : [...current, saved]
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
      setItems((current) => current.filter((workflow) => workflow.id !== deleteId))
      toast.success("Workflow deleted")
    } catch (error) {
      toast.error("Failed to delete", { description: toErrorMessage(error) })
    } finally {
      setDeleteId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!canChangeWorkflow) return

    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((workflow) => workflow.id === active.id)
    const newIndex = items.findIndex((workflow) => workflow.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)
    const updated = reordered.map((workflow, index) => ({ ...workflow, order: index + 1 }))
    setItems(updated)

    const changed = updated.filter((workflow, index) => workflow.order !== items[index]?.order)
    try {
      await Promise.all(changed.map((workflow) => patchJson<Workflow>(`/api/proxy/workflows/${workflow.id}/`, { order: workflow.order })))
      toast.success("Workflow order saved")
    } catch (error) {
      toast.error("Failed to save order", { description: toErrorMessage(error) })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search workflows…" className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {items.length} workflows
            {!isSearching ? <span className="ml-2 text-xs opacity-60">· drag to reorder</span> : null}
          </p>
          <CanCreate type="workflow">
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreateWorkflowDialog}>
              <Plus className="h-3.5 w-3.5" />
              New workflow
            </Button>
          </CanCreate>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((workflow) => workflow.id)} strategy={verticalListSortingStrategy}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 px-2" />
                  <TableHead>Name</TableHead>
                  <TableHead className="w-20 text-center">Order</TableHead>
                  <TableHead className="w-20 text-center">Enabled</TableHead>
                  <TableHead className="w-28">Triggers</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      {search ? "No workflows match your search." : "No workflows configured."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((workflow) => (
                    <SortableRow
                      key={workflow.id}
                      wf={workflow}
                      onCopy={openDuplicateWorkflowDialog}
                      onDelete={setDeleteId}
                      onEdit={openEditWorkflowDialog}
                      onToggle={toggleEnabled}
                      isDragDisabled={isSearching || !canChangeWorkflow}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
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
        <LargeEditorDialogContent initialWidth={1220} minWidth={1100} initialHeight={920} maxHeight={1100}>
          <DraggableDialogHeader>
            <DraggableDialogTitle>{editingWorkflow ? "Edit workflow" : "New workflow"}</DraggableDialogTitle>
            <DraggableDialogDescription>
              Configure typed triggers and actions using the same nested workflow model as Paperless-ngx.
            </DraggableDialogDescription>
          </DraggableDialogHeader>
          <DraggableDialogBody>
            <WorkflowEditor
              value={workflowDraft}
              onChange={setWorkflowDraft}
              lookups={lookups}
              remoteOcrConfigured={remoteOcrConfigured}
            />
          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button variant="outline" onClick={() => setWorkflowDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveWorkflow()} disabled={savingWorkflow}>
              {savingWorkflow ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingWorkflow ? "Save workflow" : "Create workflow"}
            </Button>
          </DraggableDialogFooter>
        </LargeEditorDialogContent>
      </DraggableDialog>
    </>
  )
}
