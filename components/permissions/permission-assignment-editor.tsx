"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PermissionAssignmentValue } from "@/lib/permission-assignments"
import { cn } from "@/lib/utils"

type SelectableActor = { id: number; username?: string; name?: string }

function MultiSelectCombobox({
  items,
  selected,
  onChange,
  placeholder,
  labelKey = "username",
  disabled,
}: {
  items: SelectableActor[]
  selected: number[]
  onChange: (ids: number[]) => void
  placeholder: string
  labelKey?: "username" | "name"
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full justify-start text-xs"
          disabled={disabled}
          type="button"
        >
          {selected.length > 0 ? `${selected.length} selected` : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList className="max-h-48">
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => {
                const isSelected = selected.includes(item.id)
                return (
                  <CommandItem
                    key={item.id}
                    value={item[labelKey] || item.name}
                    onSelect={() =>
                      onChange(
                        isSelected
                          ? selected.filter((id) => id !== item.id)
                          : [...selected, item.id]
                      )
                    }
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {item[labelKey] || item.name}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function PermissionAssignmentEditor({
  value,
  onChange,
  users,
  groups,
  disabled = false,
  showOwner = true,
}: {
  value: PermissionAssignmentValue
  onChange: (value: PermissionAssignmentValue) => void
  users: Array<{ id: number; username?: string }>
  groups: Array<{ id: number; name: string }>
  disabled?: boolean
  showOwner?: boolean
}) {
  return (
    <div className="space-y-4">
      {showOwner ? (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Owner</Label>
          <Select
            value={value.owner != null ? String(value.owner) : "none"}
            onValueChange={(next) =>
              onChange({
                ...value,
                owner: next === "none" ? null : Number(next),
              })
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="No owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <em className="text-muted-foreground">No owner</em>
              </SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={String(user.id)}>
                  {user.username ?? `User ${user.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          View Access
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Users</Label>
            <MultiSelectCombobox
              items={users}
              selected={value.view_users}
              onChange={(view_users) => onChange({ ...value, view_users })}
              placeholder="Select users…"
              labelKey="username"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Groups</Label>
            <MultiSelectCombobox
              items={groups}
              selected={value.view_groups}
              onChange={(view_groups) => onChange({ ...value, view_groups })}
              placeholder="Select groups…"
              labelKey="name"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Edit Access
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Users</Label>
            <MultiSelectCombobox
              items={users}
              selected={value.change_users}
              onChange={(change_users) => onChange({ ...value, change_users })}
              placeholder="Select users…"
              labelKey="username"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Groups</Label>
            <MultiSelectCombobox
              items={groups}
              selected={value.change_groups}
              onChange={(change_groups) => onChange({ ...value, change_groups })}
              placeholder="Select groups…"
              labelKey="name"
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
