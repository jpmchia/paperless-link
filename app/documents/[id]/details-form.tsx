"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useUnsavedChanges } from "@/lib/use-unsaved-changes"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import {
  documentDetailsDirtyAtom,
  documentListState,
  visibleCustomFieldsAtom,
} from "@/lib/store"

const baseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  created: z.string().optional(),
  archive_serial_number: z.number().nullable().optional(),
  correspondent: z.number().nullable().optional(),
  document_type: z.number().nullable().optional(),
  storage_path: z.number().nullable().optional(),
  tags: z.array(z.number()).optional(),
}).catchall(z.any()) // Allow dynamic custom fields

type Props = {
  document: Document & { tags?: number[], correspondent?: number | null, document_type?: number | null, storage_path?: number | null, created_date?: string, custom_fields?: any[] }
  correspondents: any[]
  documentTypes: any[]
  storagePaths: any[]
  tagsList: any[]
  customFieldsList: any[]
}

function buildDefaultValues(
  document: Props["document"],
  customFieldsList: Props["customFieldsList"]
) {
  const defaultValues: Record<string, any> = {
    title: document.title || "",
    created: document.created
      ? document.created.split("T")[0]
      : document.created_date
        ? document.created_date.split("T")[0]
        : "",
    archive_serial_number: document.archive_serial_number ?? null,
    correspondent: document.correspondent ?? null,
    document_type: document.document_type ?? null,
    storage_path: document.storage_path ?? null,
    tags: document.tags ?? [],
  }

  customFieldsList.forEach((cf) => {
    const existing = document.custom_fields?.find((f: any) => f.field === cf.id)
    defaultValues[`cf_${cf.id}`] = existing !== undefined ? existing.value : ""

    if (cf.data_type === "boolean") {
      defaultValues[`cf_${cf.id}`] =
        existing !== undefined && existing.value !== null ? existing.value : false
    }
    if (cf.data_type === "documentlink" && existing !== undefined && Array.isArray(existing.value)) {
      defaultValues[`cf_${cf.id}`] = existing.value.join(", ")
    }
  })

  return defaultValues
}

export function DetailsForm({ document, correspondents, documentTypes, storagePaths, tagsList, customFieldsList }: Props) {
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const documentList = useAtomValue(documentListState)
  const setDocumentDetailsDirty = useSetAtom(documentDetailsDirtyAtom)
  const [visibleCustomFields, setVisibleCustomFields] = useAtom(visibleCustomFieldsAtom)
  const defaultValues = buildDefaultValues(document, customFieldsList)

  // We rely on HTML validation and basic coercion for custom fields.
  const form = useForm({
    resolver: zodResolver(baseSchema),
    defaultValues: defaultValues as any
  })

  // Warn user before navigating away with unsaved changes
  useUnsavedChanges(form.formState.isDirty)

  useEffect(() => {
    setDocumentDetailsDirty(form.formState.isDirty)

    return () => {
      setDocumentDetailsDirty(false)
    }
  }, [form.formState.isDirty, setDocumentDetailsDirty])

  useEffect(() => {
    const initialFields =
      document.custom_fields
        ?.filter((cf: any) => cf.value !== null && cf.value !== "" && cf.value !== false)
        .map((cf: any) => cf.field) || []

    const newVisible = Array.from(new Set([...visibleCustomFields, ...initialFields]))
    const hasChanged =
      newVisible.length !== visibleCustomFields.length ||
      newVisible.some((fieldId, index) => fieldId !== visibleCustomFields[index])

    if (hasChanged) {
      setVisibleCustomFields(newVisible)
    }
  }, [document.custom_fields, setVisibleCustomFields, visibleCustomFields])

  useEffect(() => {
    if (form.formState.isDirty || isSaving) return
    form.reset(buildDefaultValues(document, customFieldsList))
  }, [customFieldsList, document, form, isSaving])

  async function onSubmit(values: any) {
    setIsSaving(true)
    try {
      // 1. Prepare Standard Fields
      const payload: any = {
        title: values.title,
        created: values.created ? new Date(values.created).toISOString() : undefined,
        correspondent: values.correspondent,
        document_type: values.document_type,
        storage_path: values.storage_path,
        tags: values.tags,
      }

      if (values.archive_serial_number === null || typeof values.archive_serial_number === "undefined" || isNaN(values.archive_serial_number as number)) {
          payload.archive_serial_number = null as any
      } else {
          payload.archive_serial_number = values.archive_serial_number
      }

      // 2. Prepare Custom Fields - ONLY INCLUDED VISIBLE ONES
      payload.custom_fields = []
      const visibleFieldsObjects = customFieldsList.filter(cf => visibleCustomFields.includes(cf.id))
      
      for (const cf of visibleFieldsObjects) {
        let val = values[`cf_${cf.id}`]
        
        // Handle empty values
        if (cf.data_type === 'integer' || cf.data_type === 'float') {
            if (val === "" || val === null || val === undefined) {
                val = null
            } else {
                val = cf.data_type === 'integer' ? parseInt(val) : parseFloat(val)
            }
        } else if (cf.data_type === 'documentlink' && typeof val === 'string') {
            if (val.trim() === "") {
                val = []
            } else {
                val = val.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
            }
        } else {
            if (val === "") val = null
        }
        
        if (cf.data_type === "boolean") {
             if (val === "" || val === null) val = false
             val = !!val
        }
        
        payload.custom_fields.push({
          field: cf.id,
          value: val
        })
      }

      await updateDocument(document.id!, payload)
      form.reset(values)
      toast.success("Document updated successfully")

      // Handle custom top bar button navigation
      const saveAction = sessionStorage.getItem("documentSaveAction")
      sessionStorage.removeItem("documentSaveAction")
      
      if (saveAction === "close") {
          router.push("/documents")
      } else if (saveAction === "next") {
          const currentIndex = documentList.indexOf(document.id!)
          const nextId = currentIndex >= 0 && currentIndex < documentList.length - 1 ? documentList[currentIndex + 1] : null
          if (nextId) {
              router.push(`/documents/${nextId}`)
          } else {
              router.push("/documents")
          }
      }

    } catch (error) {
      toast.error("Failed to update document")
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  // Helper for single select combobox (standard fields)
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

  // Custom Field renderer
  function renderCustomFieldInput(cf: any, field: any) {
    switch (cf.data_type) {
      case "boolean":
        return (
          <div className="flex items-center h-10">
            <Switch
              checked={field.value === true}
              onCheckedChange={field.onChange}
            />
          </div>
        )
      case "date":
        return <Input type="date" {...field} value={field.value || ""} />
      case "integer":
        return <Input type="number" {...field} value={field.value ?? ""} />
      case "float":
        return <Input type="number" step="any" {...field} value={field.value ?? ""} />
      case "monetary":
        return <Input type="text" placeholder="e.g. USD123.45" {...field} value={field.value || ""} />
      case "url":
        return <Input type="url" placeholder="https://" {...field} value={field.value || ""} />
      case "documentlink":
        return <Input type="text" placeholder="e.g. 100, 101, 102" {...field} value={field.value || ""} />
      case "select":
        return (
          <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {cf.extra_data?.select_options?.map((opt: any, index: number) => {
                const optId = opt?.id !== undefined ? String(opt.id) : String(opt)
                const optLabel = opt?.label !== undefined ? opt.label : String(opt)
                return <SelectItem key={index} value={optId}>{optLabel}</SelectItem>
              })}
            </SelectContent>
          </Select>
        )
      case "long_text":
        return <Textarea rows={4} {...field} value={field.value || ""} />
      case "string":
      default:
        return <Input type="text" {...field} value={field.value || ""} />
    }
  }

  return (
    <Form {...form}>
      <form id="document-details-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl pb-16">
        
        {/* Standard Metadata Section */}
        <div className="space-y-6">
            <div className="border-b pb-2 mb-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Standard Metadata</h4>
            </div>
            
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
        </div>

        {/* Custom Fields Section */}
        {customFieldsList.length > 0 && (
            <div className="space-y-6 mt-8">
                <div className="border-b pb-2 mb-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Custom Fields</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {customFieldsList.filter(cf => visibleCustomFields.includes(cf.id)).map(cf => {
                    const isHalfWidth = ["integer", "float", "monetary", "date", "boolean", "documentlink", "select"].includes(cf.data_type)
                    
                    return (
                    <FormField
                        key={cf.id}
                        control={form.control}
                        name={`cf_${cf.id}`}
                        render={({ field }) => (
                        <FormItem className={cn(
                            "flex flex-row items-center gap-4 space-y-0",
                            isHalfWidth ? "col-span-1" : "col-span-1 md:col-span-2"
                        )}>
                            <FormLabel className="w-[30%] min-w-[90px] sm:max-w-[150px] text-right shrink-0 m-0 leading-tight">
                            {cf.name}
                            </FormLabel>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <FormControl>
                                {renderCustomFieldInput(cf, field)}
                            </FormControl>
                            <FormMessage />
                            </div>
                        </FormItem>
                        )}
                    />
                    )
                })}
                </div>
            </div>
        )}

      </form>
    </Form>
  )
}
