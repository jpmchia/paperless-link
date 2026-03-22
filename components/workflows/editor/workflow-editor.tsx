"use client"

import * as React from "react"
import { Check, ChevronsUpDown, GripVertical, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  createDefaultAction,
  createDefaultTrigger,
  DOCUMENT_SOURCE_OPTIONS,
  MATCHING_ALGORITHM_OPTIONS,
  SCHEDULE_DATE_FIELD_OPTIONS,
  WORKFLOW_ACTION_TYPE_OPTIONS,
  WORKFLOW_TRIGGER_TYPE_OPTIONS,
  WorkflowActionType,
  WorkflowTriggerType,
  ScheduleDateField,
  type WorkflowAction,
  type WorkflowDraft,
  type WorkflowLookups,
  type WorkflowTrigger,
} from "@/components/workflows/editor/types"

function FieldCard({
  children,
  title,
  onRemove,
}: {
  children: React.ReactNode
  title: string
  onRemove: () => void
}) {
  return (
    <div className="rounded-md border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">{title}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive" onClick={onRemove}>
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Remove
        </Button>
      </div>
      {children}
    </div>
  )
}

function MultiSelectChecklist({
  items,
  label,
  value,
  onChange,
}: {
  items: Array<{ id: number; name: string }>
  label: string
  value: number[] | undefined
  onChange: (value: number[]) => void
}) {
  const current = value ?? []
  const selectedItems = current
    .map((itemId) => items.find((candidate) => candidate.id === itemId))
    .filter((item): item is { id: number; name: string } => Boolean(item))
  const visibleItems = selectedItems.slice(0, 2)
  const remainingCount = selectedItems.length - visibleItems.length

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="h-auto min-h-9 w-full justify-between py-1.5"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-left">
              {current.length > 0 ? (
                <>
                  {visibleItems.map((item) => (
                    <Badge
                      key={item.id}
                      variant="secondary"
                      className="max-w-full truncate border border-border/70 bg-accent px-2 py-0.5 text-accent-foreground shadow-sm"
                    >
                      {item.name}
                    </Badge>
                  ))}
                  {remainingCount > 0 ? (
                    <Badge
                      variant="secondary"
                      className="border border-border/60 bg-muted px-2 py-0.5 text-muted-foreground"
                    >
                      +{remainingCount} more
                    </Badge>
                  ) : null}
                </>
              ) : (
                <span className="text-muted-foreground">Select {label.toLowerCase()}...</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No options available.</CommandEmpty>
              <CommandGroup>
                {items.map((item) => {
                  const checked = current.includes(item.id)
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.name}
                      onSelect={() =>
                        onChange(
                          checked
                            ? current.filter((existingId) => existingId !== item.id)
                            : [...current, item.id]
                        )
                      }
                    >
                      <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                      {item.name}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function SingleLookupSelect({
  items,
  label,
  value,
  onChange,
  placeholder = "None",
}: {
  items: Array<{ id: number; name: string }>
  label: string
  value: number | null | undefined
  onChange: (value: number | null) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn("w-full justify-between", value == null && "text-muted-foreground")}
          >
            {items.find((item) => item.id === value)?.name ?? placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No options available.</CommandEmpty>
              <CommandGroup>
                <CommandItem value="__none" onSelect={() => onChange(null)}>
                  <Check className={cn("mr-2 h-4 w-4", value == null ? "opacity-100" : "opacity-0")} />
                  {placeholder}
                </CommandItem>
                {items.map((item) => (
                  <CommandItem key={item.id} value={item.name} onSelect={() => onChange(item.id)}>
                    <Check className={cn("mr-2 h-4 w-4", item.id === value ? "opacity-100" : "opacity-0")} />
                    {item.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function updateTriggerAt(value: WorkflowDraft, index: number, updater: (trigger: WorkflowTrigger) => WorkflowTrigger) {
  return {
    ...value,
    triggers: value.triggers.map((trigger, triggerIndex) => (triggerIndex === index ? updater(trigger) : trigger)),
  }
}

function updateActionAt(value: WorkflowDraft, index: number, updater: (action: WorkflowAction) => WorkflowAction) {
  return {
    ...value,
    actions: value.actions.map((action, actionIndex) => (actionIndex === index ? updater(action) : action)),
  }
}

function TriggerEditor({
  trigger,
  index,
  lookups,
  onChange,
  onRemove,
}: {
  trigger: WorkflowTrigger
  index: number
  lookups: WorkflowLookups
  onChange: (trigger: WorkflowTrigger) => void
  onRemove: () => void
}) {
  const isConsumption = trigger.type === WorkflowTriggerType.Consumption
  const isDocumentEvent =
    trigger.type === WorkflowTriggerType.DocumentAdded ||
    trigger.type === WorkflowTriggerType.DocumentUpdated ||
    trigger.type === WorkflowTriggerType.Scheduled
  const isScheduled = trigger.type === WorkflowTriggerType.Scheduled

  return (
    <FieldCard title={`Trigger ${index + 1}`} onRemove={onRemove}>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-2">
          <Label>Trigger type</Label>
          <Select
            value={String(trigger.type)}
            onValueChange={(next) =>
              onChange({
                ...createDefaultTrigger(),
                ...trigger,
                type: Number(next) as WorkflowTriggerType,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORKFLOW_TRIGGER_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isScheduled ? (
          <div className="space-y-2">
            <Label>Offset days</Label>
            <Input
              value={trigger.schedule_offset_days != null ? String(trigger.schedule_offset_days) : ""}
              onChange={(event) =>
                onChange({
                  ...trigger,
                  schedule_offset_days: event.target.value === "" ? null : Number(event.target.value),
                })
              }
              inputMode="numeric"
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label>Filter filename</Label>
          <Input value={trigger.filter_filename ?? ""} onChange={(event) => onChange({ ...trigger, filter_filename: event.target.value })} />
        </div>
        {isConsumption ? (
          <>
            <div className="space-y-2">
              <Label>Filter path</Label>
              <Input value={trigger.filter_path ?? ""} onChange={(event) => onChange({ ...trigger, filter_path: event.target.value })} />
            </div>
            <SingleLookupSelect
              items={lookups.mailRules ?? []}
              label="Filter mail rule"
              value={trigger.filter_mailrule ?? null}
              onChange={(next) => onChange({ ...trigger, filter_mailrule: next })}
            />
            <div className="xl:col-span-3">
              <MultiSelectChecklist
                items={DOCUMENT_SOURCE_OPTIONS.map((item) => ({ id: item.id, name: item.name }))}
                label="Filter sources"
                value={trigger.sources}
                onChange={(next) => onChange({ ...trigger, sources: next })}
              />
            </div>
          </>
        ) : null}
        {isDocumentEvent ? (
          <>
            <div className="space-y-2">
              <Label>Content matching algorithm</Label>
              <Select
                value={String(trigger.matching_algorithm ?? 0)}
                onValueChange={(next) => onChange({ ...trigger, matching_algorithm: Number(next) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATCHING_ALGORITHM_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(trigger.matching_algorithm ?? 0) !== 0 ? (
              <>
                <div className="space-y-2">
                  <Label>Content matching pattern</Label>
                  <Input value={trigger.match ?? ""} onChange={(event) => onChange({ ...trigger, match: event.target.value })} />
                </div>
                <div className="xl:col-span-3 flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Case insensitive</p>
                    <p className="text-xs text-muted-foreground">Ignore case when applying the content match.</p>
                  </div>
                  <Switch checked={Boolean(trigger.is_insensitive)} onCheckedChange={(checked) => onChange({ ...trigger, is_insensitive: checked })} />
                </div>
              </>
            ) : null}
          </>
        ) : null}
        {isScheduled ? (
          <>
            <div className="space-y-2">
              <Label>Relative to</Label>
              <Select
                value={trigger.schedule_date_field ?? ScheduleDateField.Added}
                onValueChange={(next) => onChange({ ...trigger, schedule_date_field: next as ScheduleDateField })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_DATE_FIELD_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {trigger.schedule_date_field === ScheduleDateField.CustomField ? (
              <SingleLookupSelect
                items={lookups.customFields
                  .filter((field) => field.data_type === "date")
                  .map((field) => ({ id: field.id, name: field.name }))}
                label="Schedule custom date field"
                value={trigger.schedule_date_custom_field ?? null}
                onChange={(next) => onChange({ ...trigger, schedule_date_custom_field: next })}
              />
            ) : null}
            <div className="xl:col-span-3 flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Recurring</p>
                <p className="text-xs text-muted-foreground">Trigger repeatedly using the configured interval.</p>
              </div>
              <Switch checked={Boolean(trigger.schedule_is_recurring)} onCheckedChange={(checked) => onChange({ ...trigger, schedule_is_recurring: checked })} />
            </div>
            {trigger.schedule_is_recurring ? (
              <div className="space-y-2">
                <Label>Recurring interval days</Label>
                <Input
                  value={trigger.schedule_recurring_interval_days != null ? String(trigger.schedule_recurring_interval_days) : ""}
                  onChange={(event) =>
                    onChange({
                      ...trigger,
                      schedule_recurring_interval_days: event.target.value === "" ? null : Number(event.target.value),
                    })
                  }
                  inputMode="numeric"
                />
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {isDocumentEvent ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <MultiSelectChecklist items={lookups.tags} label="Has any tags" value={trigger.filter_has_tags} onChange={(next) => onChange({ ...trigger, filter_has_tags: next })} />
          <MultiSelectChecklist items={lookups.tags} label="Has all tags" value={trigger.filter_has_all_tags} onChange={(next) => onChange({ ...trigger, filter_has_all_tags: next })} />
          <MultiSelectChecklist items={lookups.tags} label="Has no tags" value={trigger.filter_has_not_tags} onChange={(next) => onChange({ ...trigger, filter_has_not_tags: next })} />
          <MultiSelectChecklist items={lookups.correspondents} label="Has any correspondents" value={trigger.filter_has_any_correspondents} onChange={(next) => onChange({ ...trigger, filter_has_any_correspondents: next })} />
          <MultiSelectChecklist items={lookups.correspondents} label="Has no correspondents" value={trigger.filter_has_not_correspondents} onChange={(next) => onChange({ ...trigger, filter_has_not_correspondents: next })} />
          <SingleLookupSelect items={lookups.correspondents} label="Has correspondent" value={trigger.filter_has_correspondent ?? null} onChange={(next) => onChange({ ...trigger, filter_has_correspondent: next })} />
          <MultiSelectChecklist items={lookups.documentTypes} label="Has any document types" value={trigger.filter_has_any_document_types} onChange={(next) => onChange({ ...trigger, filter_has_any_document_types: next })} />
          <MultiSelectChecklist items={lookups.documentTypes} label="Has no document types" value={trigger.filter_has_not_document_types} onChange={(next) => onChange({ ...trigger, filter_has_not_document_types: next })} />
          <SingleLookupSelect items={lookups.documentTypes} label="Has document type" value={trigger.filter_has_document_type ?? null} onChange={(next) => onChange({ ...trigger, filter_has_document_type: next })} />
          <MultiSelectChecklist items={lookups.storagePaths} label="Has any storage paths" value={trigger.filter_has_any_storage_paths} onChange={(next) => onChange({ ...trigger, filter_has_any_storage_paths: next })} />
          <MultiSelectChecklist items={lookups.storagePaths} label="Has no storage paths" value={trigger.filter_has_not_storage_paths} onChange={(next) => onChange({ ...trigger, filter_has_not_storage_paths: next })} />
          <SingleLookupSelect items={lookups.storagePaths} label="Has storage path" value={trigger.filter_has_storage_path ?? null} onChange={(next) => onChange({ ...trigger, filter_has_storage_path: next })} />
          <div className="xl:col-span-3 space-y-2">
            <Label>Custom field query JSON</Label>
            <Textarea
              className="min-h-28 font-mono text-xs"
              value={trigger.filter_custom_field_query ?? ""}
              onChange={(event) => onChange({ ...trigger, filter_custom_field_query: event.target.value })}
            />
          </div>
        </div>
      ) : null}
    </FieldCard>
  )
}

function ActionEditor({
  action,
  index,
  lookups,
  onChange,
  onRemove,
}: {
  action: WorkflowAction
  index: number
  lookups: WorkflowLookups
  onChange: (action: WorkflowAction) => void
  onRemove: () => void
}) {
  const isAssignment = action.type === WorkflowActionType.Assignment
  const isRemoval = action.type === WorkflowActionType.Removal
  const isEmail = action.type === WorkflowActionType.Email
  const isWebhook = action.type === WorkflowActionType.Webhook
  const isPasswordRemoval = action.type === WorkflowActionType.PasswordRemoval

  const userItems = lookups.users.map((user) => ({ id: user.id, name: user.username ?? `User ${user.id}` }))
  const actionTypeLabel =
    WORKFLOW_ACTION_TYPE_OPTIONS.find((option) => option.id === action.type)?.name ?? `Action ${index + 1}`

  return (
    <FieldCard title={`${index + 1}. ${actionTypeLabel}`} onRemove={onRemove}>
      <div className="grid gap-3 xl:grid-cols-4">
        <div className="space-y-2">
          <Label>Action type</Label>
          <Select
            value={String(action.type)}
            onValueChange={(next) =>
              onChange({
                ...createDefaultAction(),
                ...action,
                type: Number(next) as WorkflowActionType,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORKFLOW_ACTION_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isAssignment ? (
        <div className="grid gap-3 xl:grid-cols-4">
          <div className="space-y-2 xl:col-span-2">
            <Label>Assign title</Label>
            <Input value={action.assign_title ?? ""} onChange={(event) => onChange({ ...action, assign_title: event.target.value })} />
          </div>
          <SingleLookupSelect items={lookups.documentTypes} label="Assign document type" value={action.assign_document_type ?? null} onChange={(next) => onChange({ ...action, assign_document_type: next })} />
          <SingleLookupSelect items={lookups.correspondents} label="Assign correspondent" value={action.assign_correspondent ?? null} onChange={(next) => onChange({ ...action, assign_correspondent: next })} />
          <SingleLookupSelect items={lookups.storagePaths} label="Assign storage path" value={action.assign_storage_path ?? null} onChange={(next) => onChange({ ...action, assign_storage_path: next })} />
          <SingleLookupSelect items={userItems} label="Assign owner" value={action.assign_owner ?? null} onChange={(next) => onChange({ ...action, assign_owner: next })} />
          <div className="xl:col-span-2">
            <MultiSelectChecklist items={lookups.tags} label="Assign tags" value={action.assign_tags} onChange={(next) => onChange({ ...action, assign_tags: next })} />
          </div>
          <div>
            <MultiSelectChecklist items={lookups.customFields.map((field) => ({ id: field.id, name: field.name }))} label="Assign custom fields" value={action.assign_custom_fields} onChange={(next) => onChange({ ...action, assign_custom_fields: next })} />
          </div>
          <div>
            <MultiSelectChecklist items={userItems} label="Assign view users" value={action.assign_view_users} onChange={(next) => onChange({ ...action, assign_view_users: next })} />
          </div>
          <div>
            <MultiSelectChecklist items={lookups.groups} label="Assign view groups" value={action.assign_view_groups} onChange={(next) => onChange({ ...action, assign_view_groups: next })} />
          </div>
          <div>
            <MultiSelectChecklist items={userItems} label="Assign change users" value={action.assign_change_users} onChange={(next) => onChange({ ...action, assign_change_users: next })} />
          </div>
          <div>
            <MultiSelectChecklist items={lookups.groups} label="Assign change groups" value={action.assign_change_groups} onChange={(next) => onChange({ ...action, assign_change_groups: next })} />
          </div>
          {action.assign_custom_fields && action.assign_custom_fields.length > 0 ? (
            <div className="xl:col-span-4 space-y-2">
              <Label>Assign custom field values JSON</Label>
              <Textarea
                className="min-h-20 font-mono text-xs"
                value={action.assign_custom_fields_values ? JSON.stringify(action.assign_custom_fields_values, null, 2) : ""}
                onChange={(event) => {
                  const nextValue = event.target.value
                  try {
                    onChange({ ...action, assign_custom_fields_values: nextValue ? JSON.parse(nextValue) : null })
                  } catch {
                    onChange({ ...action, assign_custom_fields_values: { __invalid_json__: nextValue } })
                  }
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {isRemoval ? (
        <div className="grid gap-3 xl:grid-cols-4">
          <div className="xl:col-span-4 grid gap-2 md:grid-cols-3 xl:grid-cols-4">
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox checked={Boolean(action.remove_all_tags)} onCheckedChange={(checked) => onChange({ ...action, remove_all_tags: Boolean(checked) })} />
              <span className="text-sm">Remove all tags</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox checked={Boolean(action.remove_all_document_types)} onCheckedChange={(checked) => onChange({ ...action, remove_all_document_types: Boolean(checked) })} />
              <span className="text-sm">Remove all document types</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox checked={Boolean(action.remove_all_correspondents)} onCheckedChange={(checked) => onChange({ ...action, remove_all_correspondents: Boolean(checked) })} />
              <span className="text-sm">Remove all correspondents</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox checked={Boolean(action.remove_all_storage_paths)} onCheckedChange={(checked) => onChange({ ...action, remove_all_storage_paths: Boolean(checked) })} />
              <span className="text-sm">Remove all storage paths</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox checked={Boolean(action.remove_all_owners)} onCheckedChange={(checked) => onChange({ ...action, remove_all_owners: Boolean(checked) })} />
              <span className="text-sm">Remove all owners</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox checked={Boolean(action.remove_all_permissions)} onCheckedChange={(checked) => onChange({ ...action, remove_all_permissions: Boolean(checked) })} />
              <span className="text-sm">Remove all permissions</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox checked={Boolean(action.remove_all_custom_fields)} onCheckedChange={(checked) => onChange({ ...action, remove_all_custom_fields: Boolean(checked) })} />
              <span className="text-sm">Remove all custom fields</span>
            </div>
          </div>
          <MultiSelectChecklist items={lookups.tags} label="Remove tags" value={action.remove_tags} onChange={(next) => onChange({ ...action, remove_tags: next })} />
          <MultiSelectChecklist items={lookups.documentTypes} label="Remove document types" value={action.remove_document_types} onChange={(next) => onChange({ ...action, remove_document_types: next })} />
          <MultiSelectChecklist items={lookups.correspondents} label="Remove correspondents" value={action.remove_correspondents} onChange={(next) => onChange({ ...action, remove_correspondents: next })} />
          <MultiSelectChecklist items={lookups.storagePaths} label="Remove storage paths" value={action.remove_storage_paths} onChange={(next) => onChange({ ...action, remove_storage_paths: next })} />
          <MultiSelectChecklist items={userItems} label="Remove owners" value={action.remove_owners} onChange={(next) => onChange({ ...action, remove_owners: next })} />
          <MultiSelectChecklist items={lookups.customFields.map((field) => ({ id: field.id, name: field.name }))} label="Remove custom fields" value={action.remove_custom_fields} onChange={(next) => onChange({ ...action, remove_custom_fields: next })} />
          <MultiSelectChecklist items={userItems} label="Remove view users" value={action.remove_view_users} onChange={(next) => onChange({ ...action, remove_view_users: next })} />
          <MultiSelectChecklist items={lookups.groups} label="Remove view groups" value={action.remove_view_groups} onChange={(next) => onChange({ ...action, remove_view_groups: next })} />
          <MultiSelectChecklist items={userItems} label="Remove change users" value={action.remove_change_users} onChange={(next) => onChange({ ...action, remove_change_users: next })} />
          <MultiSelectChecklist items={lookups.groups} label="Remove change groups" value={action.remove_change_groups} onChange={(next) => onChange({ ...action, remove_change_groups: next })} />
        </div>
      ) : null}

      {isEmail ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-2 xl:col-span-2">
            <Label>To</Label>
            <Input value={action.email?.to ?? ""} onChange={(event) => onChange({ ...action, email: { ...action.email, to: event.target.value } })} />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={action.email?.subject ?? ""} onChange={(event) => onChange({ ...action, email: { ...action.email, subject: event.target.value } })} />
          </div>
          <div className="xl:col-span-3 space-y-2">
            <Label>Body</Label>
            <Textarea className="min-h-20" value={action.email?.body ?? ""} onChange={(event) => onChange({ ...action, email: { ...action.email, body: event.target.value } })} />
          </div>
          <div className="xl:col-span-3 flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Include document</p>
              <p className="text-xs text-muted-foreground">Attach the matching document to the outgoing email.</p>
            </div>
            <Switch checked={Boolean(action.email?.include_document)} onCheckedChange={(checked) => onChange({ ...action, email: { ...action.email, include_document: checked } })} />
          </div>
        </div>
      ) : null}

      {isWebhook ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-2 xl:col-span-3">
            <Label>Webhook URL</Label>
            <Input value={action.webhook?.url ?? ""} onChange={(event) => onChange({ ...action, webhook: { ...action.webhook, url: event.target.value } })} />
          </div>
          <div className="xl:col-span-3 grid gap-3 md:grid-cols-3">
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox checked={Boolean(action.webhook?.use_params)} onCheckedChange={(checked) => onChange({ ...action, webhook: { ...action.webhook, use_params: Boolean(checked) } })} />
              <span className="text-sm">Use query params</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox checked={Boolean(action.webhook?.as_json)} onCheckedChange={(checked) => onChange({ ...action, webhook: { ...action.webhook, as_json: Boolean(checked) } })} />
              <span className="text-sm">Send as JSON</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox checked={Boolean(action.webhook?.include_document)} onCheckedChange={(checked) => onChange({ ...action, webhook: { ...action.webhook, include_document: Boolean(checked) } })} />
              <span className="text-sm">Include document</span>
            </div>
          </div>
          <div className="space-y-2 xl:col-span-1">
            <Label>Params JSON</Label>
            <Textarea
              className="min-h-24 font-mono text-xs"
              value={action.webhook?.params ? JSON.stringify(action.webhook.params, null, 2) : ""}
              onChange={(event) => {
                const nextValue = event.target.value
                try {
                  onChange({ ...action, webhook: { ...action.webhook, params: nextValue ? JSON.parse(nextValue) : null } })
                } catch {
                  onChange({ ...action, webhook: { ...action.webhook, params: { __invalid_json__: nextValue } } })
                }
              }}
            />
          </div>
          <div className="space-y-2 xl:col-span-1">
            <Label>Headers JSON</Label>
            <Textarea
              className="min-h-24 font-mono text-xs"
              value={action.webhook?.headers ? JSON.stringify(action.webhook.headers, null, 2) : ""}
              onChange={(event) => {
                const nextValue = event.target.value
                try {
                  onChange({ ...action, webhook: { ...action.webhook, headers: nextValue ? JSON.parse(nextValue) : null } })
                } catch {
                  onChange({ ...action, webhook: { ...action.webhook, headers: { __invalid_json__: nextValue } } })
                }
              }}
            />
          </div>
          <div className="xl:col-span-1 space-y-2">
            <Label>Body</Label>
            <Textarea className="min-h-24" value={action.webhook?.body ?? ""} onChange={(event) => onChange({ ...action, webhook: { ...action.webhook, body: event.target.value } })} />
          </div>
        </div>
      ) : null}

      {isPasswordRemoval ? (
        <div className="space-y-2">
          <Label>Passwords</Label>
          <Textarea
            className="min-h-24"
            placeholder="One password per line"
            value={(action.passwords ?? []).join("\n")}
            onChange={(event) =>
              onChange({
                ...action,
                passwords: event.target.value
                  .split("\n")
                  .map((password) => password.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      ) : null}
    </FieldCard>
  )
}

export function WorkflowEditor({
  lookups,
  onChange,
  value,
}: {
  lookups: WorkflowLookups
  onChange: (value: WorkflowDraft) => void
  value: WorkflowDraft
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="workflow-name">Name</Label>
          <Input id="workflow-name" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workflow-order">Sort order</Label>
          <Input id="workflow-order" value={value.order} onChange={(event) => onChange({ ...value, order: event.target.value })} inputMode="numeric" />
        </div>
        <div className="xl:col-span-1 flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Enabled</p>
            <p className="text-xs text-muted-foreground">Disabled workflows remain saved but do not run.</p>
          </div>
          <Switch checked={value.enabled} onCheckedChange={(checked) => onChange({ ...value, enabled: checked })} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Triggers</p>
            <p className="text-xs text-muted-foreground">Define when the workflow should run.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...value, triggers: [...value.triggers, createDefaultTrigger()] })}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add trigger
          </Button>
        </div>
        <div className="space-y-4">
          {value.triggers.map((trigger, index) => (
            <TriggerEditor
              key={`${trigger.id ?? "new"}-${index}`}
              index={index}
              lookups={lookups}
              trigger={trigger}
              onChange={(nextTrigger) => onChange(updateTriggerAt(value, index, () => nextTrigger))}
              onRemove={() => onChange({ ...value, triggers: value.triggers.filter((_, triggerIndex) => triggerIndex !== index) })}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Actions</p>
            <p className="text-xs text-muted-foreground">Define what the workflow should do when it matches.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...value, actions: [...value.actions, createDefaultAction()] })}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add action
          </Button>
        </div>
        <div className="space-y-4">
          {value.actions.map((action, index) => (
            <ActionEditor
              key={`${action.id ?? "new"}-${index}`}
              action={action}
              index={index}
              lookups={lookups}
              onChange={(nextAction) => onChange(updateActionAt(value, index, () => nextAction))}
              onRemove={() => onChange({ ...value, actions: value.actions.filter((_, actionIndex) => actionIndex !== index) })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
