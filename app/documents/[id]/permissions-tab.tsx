"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Loader2, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { Document } from "../columns"
import { updateDocument } from "./actions"
import { toast } from "sonner"

type Props = {
  document: Document & { owner?: number | null, permissions?: { view?: { users?: number[], groups?: number[] }, change?: { users?: number[], groups?: number[] } } }
  usersList: any[]
  groupsList: any[]
}

export function PermissionsTab({ document, usersList, groupsList }: Props) {
  const [isSaving, setIsSaving] = useState(false)

  const defaultValues = {
    owner: document.owner ?? null,
    view_users: document.permissions?.view?.users ?? [],
    view_groups: document.permissions?.view?.groups ?? [],
    change_users: document.permissions?.change?.users ?? [],
    change_groups: document.permissions?.change?.groups ?? [],
  }

  const form = useForm({
    defaultValues
  })

  async function onSubmit(values: any) {
    setIsSaving(true)
    try {
      const payload = {
        owner: values.owner,
        set_permissions: {
          view: {
            users: values.view_users,
            groups: values.view_groups
          },
          change: {
            users: values.change_users,
            groups: values.change_groups
          }
        }
      }

      await updateDocument(document.id!, payload)
      form.reset(values)
      toast.success("Permissions updated successfully")
    } catch (error) {
      toast.error("Failed to update permissions")
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  // Helper for single select user
  const renderCombobox = (
    field: any,
    items: any[],
    placeholder: string,
    emptyText: string
  ) => {
    const selectedItem = items.find((item) => item.id === field.value)
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                "w-full justify-between",
                !field.value && "text-muted-foreground"
              )}
            >
              {selectedItem ? selectedItem.username || selectedItem.name : placeholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="-- Clear --"
                  onSelect={() => field.onChange(null)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      field.value === null ? "opacity-100" : "opacity-0"
                    )}
                  />
                  -- Clear --
                </CommandItem>
                {items.map((item) => (
                  <CommandItem
                    value={item.username || item.name}
                    key={item.id}
                    onSelect={() => field.onChange(item.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        item.id === field.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {item.username || item.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }

  // Multi-select for users/groups
  const renderMultiCombobox = (field: any, items: any[], placeholder: string) => {
    const selectedIds = field.value || []

    return (
      <div className="flex flex-col gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <FormControl>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
              >
                {selectedIds.length > 0
                  ? `${selectedIds.length} selected`
                  : placeholder}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder={`Search...`} />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {items.map((item) => {
                    const isSelected = selectedIds.includes(item.id)
                    return (
                      <CommandItem
                        key={item.id}
                        value={item.username || item.name}
                        onSelect={() => {
                          if (isSelected) {
                            field.onChange(selectedIds.filter((id: number) => id !== item.id))
                          } else {
                            field.onChange([...selectedIds, item.id])
                          }
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {item.username || item.name}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedIds.map((id: number) => {
              const item = items.find((t) => t.id === id)
              if (!item) return null
              return (
                <Badge
                  key={item.id}
                  variant="secondary"
                  className="flex items-center gap-1 px-2 py-1"
                >
                  {item.username || item.name}
                  <button
                    type="button"
                    className="ml-1 hover:bg-black/20 rounded-full p-0.5"
                    onClick={() => {
                      field.onChange(selectedIds.filter((selectedId: number) => selectedId !== item.id))
                    }}
                  >
                    ×
                  </button>
                </Badge>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-6 py-6 pb-20 h-full overflow-y-auto w-full outline-none">
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
            <div>
            <h3 className="text-lg font-medium">Permissions</h3>
            <p className="text-sm text-muted-foreground">Manage who can view and edit this document.</p>
            </div>

            <FormField
            control={form.control}
            name="owner"
            render={({ field }: any) => (
                <FormItem className="flex flex-col">
                <FormLabel>Document Owner</FormLabel>
                {renderCombobox(field, usersList, "Select Owner", "No user found.")}
                <FormDescription>
                    The owner has full control over the document. If left empty, the document is accessible by anyone.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />

            <div className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mt-8 border-b pb-2">View Access</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="view_users"
                    render={({ field }: any) => (
                        <FormItem>
                        <FormLabel>Users</FormLabel>
                        {renderMultiCombobox(field, usersList, "Select Users...")}
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="view_groups"
                    render={({ field }: any) => (
                        <FormItem>
                        <FormLabel>Groups</FormLabel>
                        {renderMultiCombobox(field, groupsList, "Select Groups...")}
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mt-8 border-b pb-2">Edit Access</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="change_users"
                    render={({ field }: any) => (
                        <FormItem>
                        <FormLabel>Users</FormLabel>
                        {renderMultiCombobox(field, usersList, "Select Users...")}
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="change_groups"
                    render={({ field }: any) => (
                        <FormItem>
                        <FormLabel>Groups</FormLabel>
                        {renderMultiCombobox(field, groupsList, "Select Groups...")}
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
            </div>

            <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Permissions
            </Button>
            </div>
        </form>
        </Form>
    </div>
  )
}
