"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { useUnsavedChanges } from "@/lib/use-unsaved-changes"
import { usePermissions } from "@/hooks/use-permissions"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Check, ChevronsUpDown, Plus, Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"

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
import { updateUiSettings } from "@/app/actions/ui-settings"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Dialog as DraggableDialog,
  DialogBody as DraggableDialogBody,
  DialogContent as DraggableDialogContent,
  DialogHeader as DraggableDialogHeader,
  DialogTitle as DraggableDialogTitle,
} from "@/components/draggable-dialog"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { buildUpdateDocumentPayload, normalizeCustomFieldSelectValue } from "./details-payload"
import {
  documentDetailAvailableFieldsAtom,
  documentDetailFieldLayoutAtom,
  documentDetailFieldLayoutRevisionAtom,
  documentDetailsDirtyAtom,
  documentListState,
} from "@/lib/store"
import { fetchUiSettings } from "@/lib/ui-settings"
import {
  updateCustomField,
} from "@/lib/management-actions"
import { CorrespondentsTable } from "@/app/correspondents/correspondents-table"
import { TagsTable } from "@/app/tags/tags-table"
import { DocumentTypesTable } from "@/app/document-types/document-types-table"
import {
  areDetailFieldLayoutsEqual,
  buildAvailableDetailFields,
  DOCUMENT_DETAIL_LAYOUTS_BY_TYPE_KEY,
  DOCUMENT_DETAIL_LAYOUTS_STORAGE_KEY,
  getDefaultDetailFieldLayout,
  getDocumentTypeLayoutStorageKey,
  parseDetailCustomFieldId,
  resolveDetailFieldLayoutForDocumentType,
} from "./detail-field-layout"

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

type CreateDialogState =
  | { type: "selectOption"; fieldId: number }
  | null

function getSelectOptionLabel(option: any): string {
  if (typeof option === "string") return option
  if (option?.label !== undefined && option?.label !== null) return String(option.label)
  if (option?.id !== undefined && option?.id !== null) return String(option.id)
  return ""
}

function getSelectOptionId(option: any): string {
  if (typeof option === "string") return option
  if (option?.id !== undefined && option?.id !== null) return String(option.id)
  return getSelectOptionLabel(option)
}

function getSelectOptionValue(option: any, index: number): string {
  return typeof option === "string" ? String(index) : getSelectOptionId(option)
}

function normalizeSelectOptionsForApi(selectOptions: any[] | undefined) {
  return (selectOptions ?? [])
    .map((option) => {
      const label = getSelectOptionLabel(option)
      const id = typeof option === "string" ? undefined : option?.id
      return label ? { label, ...(id ? { id: String(id) } : {}) } : null
    })
    .filter((option): option is { label: string; id?: string } => option !== null)
}

function readCachedDetailLayouts() {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(DOCUMENT_DETAIL_LAYOUTS_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string[]>) : {}
  } catch {
    return {}
  }
}

function writeCachedDetailLayouts(layouts: Record<string, string[]>) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(DOCUMENT_DETAIL_LAYOUTS_STORAGE_KEY, JSON.stringify(layouts))
  } catch {
    // Ignore storage errors and fall back to in-memory state.
  }
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
    if (cf.data_type === "select") {
      const rawValue = existing !== undefined ? existing.value : null
      const normalizedValue = normalizeCustomFieldSelectValue(cf, rawValue)
      const matchingOption = (cf.extra_data?.select_options ?? []).find(
        (option: any) => getSelectOptionId(option) === normalizedValue || getSelectOptionLabel(option) === String(rawValue ?? "")
      )
      defaultValues[`cf_${cf.id}`] = matchingOption ? getSelectOptionId(matchingOption) : normalizedValue
    }
  })

  return defaultValues
}

export function DetailsForm({ document, correspondents, documentTypes, storagePaths, tagsList, customFieldsList }: Props) {
  const [isSaving, setIsSaving] = React.useState(false)
  const [detailLayoutsByType, setDetailLayoutsByType] = React.useState<Record<string, string[]>>(() =>
    readCachedDetailLayouts()
  )
  const [correspondentItems, setCorrespondentItems] = React.useState(correspondents)
  const [documentTypeItems, setDocumentTypeItems] = React.useState(documentTypes)
  const [tagItems, setTagItems] = React.useState(tagsList)
  const [customFieldDefinitions, setCustomFieldDefinitions] = React.useState(customFieldsList)
  const [createDialog, setCreateDialog] = React.useState<CreateDialogState>(null)
  const [correspondentsDialogOpen, setCorrespondentsDialogOpen] = React.useState(false)
  const [tagsDialogOpen, setTagsDialogOpen] = React.useState(false)
  const [documentTypesDialogOpen, setDocumentTypesDialogOpen] = React.useState(false)
  const [newEntityName, setNewEntityName] = React.useState("")
  const [creatingEntity, setCreatingEntity] = React.useState(false)
  const router = useRouter()
  const { can } = usePermissions()
  const documentList = useAtomValue(documentListState)
  const setDocumentDetailsDirty = useSetAtom(documentDetailsDirtyAtom)
  const [detailFieldLayout, setDetailFieldLayout] = useAtom(documentDetailFieldLayoutAtom)
  const layoutRevision = useAtomValue(documentDetailFieldLayoutRevisionAtom)
  const setDetailAvailableFields = useSetAtom(documentDetailAvailableFieldsAtom)
  const defaultValues = buildDefaultValues(document, customFieldDefinitions)
  const defaultValuesSnapshot = React.useMemo(() => JSON.stringify(defaultValues), [defaultValues])
  const lastResetSnapshotRef = React.useRef<string | null>(null)
  const availableDetailFields = React.useMemo(
    () => buildAvailableDetailFields(customFieldDefinitions),
    [customFieldDefinitions]
  )
  const availableDetailFieldIds = React.useMemo(
    () => availableDetailFields.map((field) => field.id),
    [availableDetailFields]
  )
  const fallbackDetailFieldLayout = React.useMemo(
    () => getDefaultDetailFieldLayout(document, customFieldDefinitions),
    [customFieldDefinitions, document]
  )

  // We rely on HTML validation and basic coercion for custom fields.
  const form = useForm({
    resolver: zodResolver(baseSchema),
    defaultValues: defaultValues as any
  })
  const currentDocumentTypeId = form.watch("document_type")

  // Warn user before navigating away with unsaved changes
  useUnsavedChanges(form.formState.isDirty)

  React.useEffect(() => {
    setDocumentDetailsDirty(form.formState.isDirty)

    return () => {
      setDocumentDetailsDirty(false)
    }
  }, [form.formState.isDirty, setDocumentDetailsDirty])

  React.useEffect(() => {
    setCorrespondentItems(correspondents)
  }, [correspondents])

  React.useEffect(() => {
    setDocumentTypeItems(documentTypes)
  }, [documentTypes])

  React.useEffect(() => {
    setTagItems(tagsList)
  }, [tagsList])

  React.useEffect(() => {
    setCustomFieldDefinitions(customFieldsList)
  }, [customFieldsList])

  React.useEffect(() => {
    setDetailAvailableFields(availableDetailFields)
  }, [availableDetailFields, setDetailAvailableFields])

  React.useEffect(() => {
    let isCancelled = false

    void fetchUiSettings()
      .then((uiSettings) => {
        if (isCancelled) return

        const serverLayouts =
          (uiSettings.settings?.[DOCUMENT_DETAIL_LAYOUTS_BY_TYPE_KEY] as Record<string, string[]> | undefined) ??
          {}
        const mergedLayouts = {
          ...serverLayouts,
          ...readCachedDetailLayouts(),
        }
        setDetailLayoutsByType(mergedLayouts)
      })
      .catch(() => {
        if (!isCancelled) {
          setDetailLayoutsByType(readCachedDetailLayouts())
        }
      })

    return () => {
      isCancelled = true
    }
  }, [])

  React.useEffect(() => {
    setDetailFieldLayout(
      resolveDetailFieldLayoutForDocumentType(
        detailLayoutsByType,
        typeof currentDocumentTypeId === "number" ? currentDocumentTypeId : null,
        availableDetailFieldIds,
        fallbackDetailFieldLayout
      )
    )
  }, [
    availableDetailFieldIds,
    currentDocumentTypeId,
    detailLayoutsByType,
    fallbackDetailFieldLayout,
    setDetailFieldLayout,
  ])

  React.useEffect(() => {
    if (layoutRevision === 0) return

    const documentTypeKey = getDocumentTypeLayoutStorageKey(
      typeof currentDocumentTypeId === "number" ? currentDocumentTypeId : null
    )
    if (areDetailFieldLayoutsEqual(detailLayoutsByType[documentTypeKey], detailFieldLayout)) {
      return
    }

    const nextLayouts = {
      ...detailLayoutsByType,
      [documentTypeKey]: detailFieldLayout,
    }

    writeCachedDetailLayouts(nextLayouts)
    setDetailLayoutsByType(nextLayouts)

    const timeout = window.setTimeout(() => {
      void updateUiSettings({
        [DOCUMENT_DETAIL_LAYOUTS_BY_TYPE_KEY]: nextLayouts,
      })
        .catch((error) => {
          console.error("Failed to save document detail field layout", error)
        })
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [currentDocumentTypeId, detailFieldLayout, detailLayoutsByType, layoutRevision])

  React.useEffect(() => {
    if (form.formState.isDirty || isSaving) return
    if (lastResetSnapshotRef.current === defaultValuesSnapshot) return

    form.reset(defaultValues)
    lastResetSnapshotRef.current = defaultValuesSnapshot
  }, [defaultValues, defaultValuesSnapshot, form, isSaving, form.formState.isDirty])

  const openCreateDialog = React.useCallback((state: NonNullable<CreateDialogState>) => {
    if (state.type === "selectOption") {
      setCreateDialog(state)
      setNewEntityName("")
    }
  }, [])

  const closeCreateDialog = React.useCallback(() => {
    if (creatingEntity) return
    setCreateDialog(null)
    setNewEntityName("")
  }, [creatingEntity])

  const createDialogTitle = React.useMemo(() => {
    switch (createDialog?.type) {
      case "selectOption": {
        const field = customFieldDefinitions.find((item) => item.id === createDialog.fieldId)
        return field ? `Add Option to ${field.name}` : "Add Option"
      }
      default:
        return ""
    }
  }, [createDialog, customFieldDefinitions])

  const handleCreateEntity = React.useCallback(async () => {
    const trimmedName = newEntityName.trim()
    if (!createDialog || !trimmedName) return

    setCreatingEntity(true)
    try {
      switch (createDialog.type) {
        case "selectOption": {
          const customField = customFieldDefinitions.find((field) => field.id === createDialog.fieldId)
          if (!customField) {
            throw new Error("Custom field not found")
          }
          const existingOptions = Array.isArray(customField.extra_data?.select_options)
            ? [...customField.extra_data.select_options]
            : []

          const existingOption = existingOptions.find((option: any) => {
            if (typeof option === "string") {
              return option === trimmedName
            }

            return option?.label === trimmedName || option?.id === trimmedName
          })

          if (existingOption) {
            form.setValue(
              `cf_${customField.id}`,
              normalizeCustomFieldSelectValue(customField, trimmedName),
              { shouldDirty: true }
            )
            toast.success(`Option "${trimmedName}" selected`)
            break
          }
          const updated = await updateCustomField(customField.id, {
            extra_data: {
              select_options: normalizeSelectOptionsForApi([...existingOptions, { label: trimmedName }]),
            },
          })
          setCustomFieldDefinitions((prev) =>
            prev.map((field) => (field.id === updated.id ? updated : field))
          )
          form.setValue(
            `cf_${customField.id}`,
            normalizeCustomFieldSelectValue(updated, trimmedName),
            { shouldDirty: true }
          )
          toast.success(`Option "${trimmedName}" added`)
          break
        }
      }

      setCreateDialog(null)
      setNewEntityName("")
    } catch (error) {
      console.error(error)
      toast.error("Failed to create item")
    } finally {
      setCreatingEntity(false)
    }
  }, [createDialog, customFieldDefinitions, form, newEntityName])

  async function onSubmit(values: any) {
    setIsSaving(true)
    try {
      let normalizedCustomFieldDefinitions = customFieldDefinitions
      const legacySelectFields = customFieldDefinitions.filter(
        (field: any) =>
          field.data_type === "select" &&
          Array.isArray(field.extra_data?.select_options) &&
          field.extra_data.select_options.some((option: any) => typeof option === "string")
      )

      if (legacySelectFields.length > 0) {
        const normalizedFields = await Promise.all(
          legacySelectFields.map((field: any) =>
            updateCustomField(field.id, {
              extra_data: {
                select_options: normalizeSelectOptionsForApi(field.extra_data?.select_options),
              },
            })
          )
        )

        normalizedCustomFieldDefinitions = customFieldDefinitions.map((field: any) => {
          const normalizedField = normalizedFields.find((item) => item.id === field.id)
          return normalizedField ?? field
        })
        setCustomFieldDefinitions(normalizedCustomFieldDefinitions)
      }

      const payload = buildUpdateDocumentPayload(
        values,
        normalizedCustomFieldDefinitions,
        detailFieldLayout
          .map(parseDetailCustomFieldId)
          .filter((fieldId): fieldId is number => fieldId !== null)
      )

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
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              className="h-auto min-h-10 w-full justify-between py-2"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-left">
                {selectedTags.length > 0 ? (
                  selectedTags.map((tagId: number) => {
                    const tag = tagItems.find((t) => t.id === tagId)
                    if (!tag) return null

                    return (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="max-w-full truncate px-2 py-0.5"
                        style={{
                          backgroundColor: tag.text_color ? tag.color : undefined,
                          color: tag.text_color || undefined,
                        }}
                      >
                        {tag.name}
                      </Badge>
                    )
                  })
                ) : (
                  <span className="text-muted-foreground">Select Tags...</span>
                )}
              </div>
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
                {tagItems.map((tag) => {
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
    )
  }

  const renderCustomSelectCombobox = (cf: any, field: any) => {
    const options = cf.extra_data?.select_options ?? []
    const selectedOption = options.find((option: any, index: number) => {
      const optionValue = getSelectOptionValue(option, index)
      return optionValue === String(field.value ?? "")
    })

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
              {selectedOption ? getSelectOptionLabel(selectedOption) : "Select an option"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${cf.name.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="-- Clear --"
                  onSelect={() => field.onChange(null)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      field.value === null || field.value === "" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  -- Clear --
                </CommandItem>
                {options.map((option: any, index: number) => {
                  const optionValue = getSelectOptionValue(option, index)
                  const optionLabel = getSelectOptionLabel(option)

                  return (
                    <CommandItem
                      key={`${cf.id}-${optionValue}`}
                      value={optionLabel}
                      onSelect={() => field.onChange(optionValue)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          optionValue === String(field.value ?? "") ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {optionLabel}
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

  const renderDatePicker = (field: any, placeholder = "Pick a date") => {
    const selectedDate =
      typeof field.value === "string" && field.value
        ? parseISO(field.value)
        : undefined

    return (
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-between text-left font-normal",
                !field.value && "text-muted-foreground"
              )}
            >
              {selectedDate ? format(selectedDate, "dd/MM/yyyy") : placeholder}
              <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
            initialFocus
            captionLayout="dropdown"
          />
          {field.value ? (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => field.onChange("")}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
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
        return renderDatePicker(field)
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
        return renderCustomSelectCombobox(cf, field)
      case "long_text":
        return <Textarea rows={4} {...field} value={field.value || ""} />
      case "string":
      default:
        return <Input type="text" {...field} value={field.value || ""} />
    }
  }

  function renderDetailField(fieldId: string) {
    const renderFieldLabel = (
      label: string,
      createState?: NonNullable<CreateDialogState> | null
    ) => (
      <div className="flex items-center justify-between gap-2">
        <FormLabel>{label}</FormLabel>
        {createState ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
            onClick={() => openCreateDialog(createState)}
          >
            <Plus className="mr-1 h-3 w-3" />
            New
          </Button>
        ) : null}
      </div>
    )

      switch (fieldId) {
      case "title":
        return (
          <FormField
            key={fieldId}
            control={form.control}
            name="title"
            render={({ field }: any) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )
      case "created":
        return (
          <FormField
            key={fieldId}
            control={form.control}
            name="created"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Created Date</FormLabel>
                {renderDatePicker(field, "Pick created date")}
                <FormMessage />
              </FormItem>
            )}
          />
        )
      case "archive_serial_number":
        return (
          <FormField
            key={fieldId}
            control={form.control}
            name="archive_serial_number"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>ASN</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={field.value || ""}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value ? Number.parseInt(event.target.value, 10) : null
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )
      case "correspondent":
        return (
          <FormField
            key={fieldId}
            control={form.control}
            name="correspondent"
            render={({ field }: any) => (
              <FormItem className="flex flex-col shrink-1">
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>Correspondent</FormLabel>
                  {can("create", "correspondent") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-accent"
                      onClick={() => setCorrespondentsDialogOpen(true)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Manage
                    </Button>
                  )}
                </div>
                {renderCombobox(field, correspondentItems, "Correspondent", "No Correspondent found.")}
                <FormMessage />
              </FormItem>
            )}
          />
        )
      case "document_type":
        return (
          <FormField
            key={fieldId}
            control={form.control}
            name="document_type"
            render={({ field }: any) => (
              <FormItem className="flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>Document Type</FormLabel>
                  {can("create", "documentType") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-accent"
                      onClick={() => setDocumentTypesDialogOpen(true)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Manage
                    </Button>
                  )}
                </div>
                {renderCombobox(field, documentTypeItems, "Document Type", "No Document Type found.")}
                <FormMessage />
              </FormItem>
            )}
          />
        )
      case "storage_path":
        return (
          <FormField
            key={fieldId}
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
        )
      case "tags":
        return (
          <FormField
            key={fieldId}
            control={form.control}
            name="tags"
            render={({ field }: any) => (
              <FormItem className="md:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>Tags</FormLabel>
                  {can("create", "tag") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-accent"
                      onClick={() => setTagsDialogOpen(true)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Manage
                    </Button>
                  )}
                </div>
                {renderTagsCombobox(field)}
                <FormMessage />
              </FormItem>
            )}
          />
        )
      default: {
        const customFieldId = parseDetailCustomFieldId(fieldId)
        if (customFieldId === null) return null

        const customField = customFieldDefinitions.find((field) => field.id === customFieldId)
        if (!customField) return null

        const isHalfWidth = ["integer", "float", "monetary", "date", "boolean", "documentlink", "select"].includes(customField.data_type)

        return (
          <FormField
            key={fieldId}
            control={form.control}
            name={`cf_${customField.id}`}
            render={({ field }) => (
              <FormItem className={cn(isHalfWidth ? "md:col-span-1" : "md:col-span-2")}>
                {renderFieldLabel(
                  customField.name,
                  customField.data_type === "select" && can("change", "customField")
                    ? { type: "selectOption", fieldId: customField.id }
                    : null
                )}
                <FormControl>{renderCustomFieldInput(customField, field)}</FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )
      }
    }
  }

  return (
    <Form {...form}>
      <form id="document-details-form" onSubmit={form.handleSubmit(onSubmit)} className="max-w-4xl pb-16">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
          {detailFieldLayout.map((fieldId) => renderDetailField(fieldId))}
        </div>
      </form>
      <Dialog open={createDialog !== null} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{createDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="detail-create-name">
                {createDialog?.type === "selectOption" ? "Option label" : "Name"}
              </Label>
              <Input
                id="detail-create-name"
                value={newEntityName}
                onChange={(event) => setNewEntityName(event.target.value)}
                placeholder={createDialog?.type === "selectOption" ? "New option…" : "Name"}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreateDialog} disabled={creatingEntity}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateEntity()}
              disabled={creatingEntity || !newEntityName.trim()}
            >
              {creatingEntity ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DraggableDialog open={correspondentsDialogOpen} onOpenChange={setCorrespondentsDialogOpen}>
        <DraggableDialogContent initialWidth={1100} initialHeight={760} maxWidth={1400}>
          <DraggableDialogHeader>
            <DraggableDialogTitle>Correspondents</DraggableDialogTitle>
          </DraggableDialogHeader>
          <DraggableDialogBody className="pb-6">
          <CorrespondentsTable
            initialCorrespondents={correspondentItems}
            onItemsChange={setCorrespondentItems}
            onSelectCorrespondent={(correspondent) => {
              form.setValue("correspondent", correspondent.id, { shouldDirty: true })
              setCorrespondentsDialogOpen(false)
              toast.success(`Selected "${correspondent.name}"`)
            }}
            selectLabel="Use"
          />
          </DraggableDialogBody>
        </DraggableDialogContent>
      </DraggableDialog>
      <DraggableDialog open={documentTypesDialogOpen} onOpenChange={setDocumentTypesDialogOpen}>
        <DraggableDialogContent initialWidth={1100} initialHeight={760} maxWidth={1400}>
          <DraggableDialogHeader>
            <DraggableDialogTitle>Document Types</DraggableDialogTitle>
          </DraggableDialogHeader>
          <DraggableDialogBody className="pb-6">
          <DocumentTypesTable
            initialItems={documentTypeItems}
            onItemsChange={setDocumentTypeItems}
            onSelectDocumentType={(item) => {
              form.setValue("document_type", item.id, { shouldDirty: true })
              setDocumentTypesDialogOpen(false)
              toast.success(`Selected "${item.name}"`)
            }}
            selectLabel="Use"
          />
          </DraggableDialogBody>
        </DraggableDialogContent>
      </DraggableDialog>
      <DraggableDialog open={tagsDialogOpen} onOpenChange={setTagsDialogOpen}>
        <DraggableDialogContent initialWidth={1100} initialHeight={760} maxWidth={1400}>
          <DraggableDialogHeader>
            <DraggableDialogTitle>Tags</DraggableDialogTitle>
          </DraggableDialogHeader>
          <DraggableDialogBody className="pb-6">
          <TagsTable
            initialTags={tagItems}
            onItemsChange={setTagItems}
            onSelectTag={(tag) => {
              const currentTags = form.getValues("tags") ?? []
              form.setValue("tags", Array.from(new Set([...currentTags, tag.id])), {
                shouldDirty: true,
              })
              setTagsDialogOpen(false)
              toast.success(`Added "${tag.name}"`)
            }}
            selectLabel="Use"
          />
          </DraggableDialogBody>
        </DraggableDialogContent>
      </DraggableDialog>
    </Form>
  )
}
