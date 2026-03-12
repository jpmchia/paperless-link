"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
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
import { Document } from "../columns"
import { updateDocument } from "./actions"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  created: z.string().optional(),
  archive_serial_number: z.number().nullable().optional(),
  correspondent: z.number().nullable().optional(),
  document_type: z.number().nullable().optional(),
  storage_path: z.number().nullable().optional(),
  tags: z.array(z.number()).optional(),
})

type Props = {
  document: Document & { tags?: number[], correspondent?: number, document_type?: number, storage_path?: number, created_date?: string }
  correspondents: any[]
  documentTypes: any[]
  storagePaths: any[]
  tagsList: any[]
}

export function MetadataForm({ document, correspondents, documentTypes, storagePaths, tagsList }: Props) {
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: document.title || "",
      created: document.created ? document.created.split("T")[0] : document.created_date ? document.created_date.split("T")[0] : "",
      archive_serial_number: document.archive_serial_number ?? null,
      correspondent: document.correspondent ?? null,
      document_type: document.document_type ?? null,
      storage_path: document.storage_path ?? null,
      tags: document.tags ?? [],
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true)
    try {
      // Clean up payload (empty strings to null where applicable)
      const payload = {
        ...values,
        created: values.created ? new Date(values.created).toISOString() : undefined
      }
      if (values.archive_serial_number === null || typeof values.archive_serial_number === "undefined" || isNaN(values.archive_serial_number as number)) {
          payload.archive_serial_number = null as any
      }

      await updateDocument(document.id!, payload as any)
      toast.success("Document updated successfully")
    } catch (error) {
      toast.error("Failed to update document")
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  // Helper for single select combobox
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
              {selectedItem ? selectedItem.name : placeholder}
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
                    value={item.name}
                    key={item.id}
                    onSelect={() => field.onChange(item.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        item.id === field.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {item.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }

  // Multi-select for tags
  const renderTagsCombobox = (field: any) => {
    const selectedTags = field.value || []

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
                {selectedTags.length > 0
                  ? `${selectedTags.length} tag(s) selected`
                  : "Select Tags..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandList>
                <CommandEmpty>No Tags found.</CommandEmpty>
                <CommandGroup>
                  {tagsList.map((tag) => {
                    const isSelected = selectedTags.includes(tag.id)
                    return (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => {
                          if (isSelected) {
                            field.onChange(selectedTags.filter((id: number) => id !== tag.id))
                          } else {
                            field.onChange([...selectedTags, tag.id])
                          }
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2">
                          {tag.name}
                          {tag.color && (
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                          )}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Selected Tags Display */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedTags.map((tagId: number) => {
              const tag = tagsList.find((t) => t.id === tagId)
              if (!tag) return null
              return (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="flex items-center gap-1 px-2 py-1"
                  style={{ backgroundColor: tag.text_color ? tag.color : undefined, color: tag.text_color || undefined }}
                >
                  {tag.name}
                  <button
                    type="button"
                    className="ml-1 hover:bg-black/20 rounded-full p-0.5"
                    onClick={() => {
                      field.onChange(selectedTags.filter((id: number) => id !== tag.id))
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <FormField
          control={form.control}
          name="title"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="created"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Created Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="archive_serial_number"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>ASN</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    value={field.value || ""} 
                    onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="correspondent"
          render={({ field }: any) => (
            <FormItem className="flex flex-col">
              <FormLabel>Correspondent</FormLabel>
              {renderCombobox(field, correspondents, "Correspondent", "No Correspondent found.")}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="document_type"
          render={({ field }: any) => (
            <FormItem className="flex flex-col">
              <FormLabel>Document Type</FormLabel>
              {renderCombobox(field, documentTypes, "Document Type", "No Document Type found.")}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="storage_path"
          render={({ field }: any) => (
            <FormItem className="flex flex-col">
              <FormLabel>Storage Path</FormLabel>
              {renderCombobox(field, storagePaths, "Storage Path", "No Storage Path found.")}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              {renderTagsCombobox(field)}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-4 flex justify-end">
          <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  )
}
