"use client"

import * as React from "react"
import { CanChange } from "@/components/permissions/can-change"
import { CanDelete } from "@/components/permissions/can-delete"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Trash2, Download, User, FileType, FolderOpen, X, RotateCcw, Check,
  ShieldCheck, FormInput, Merge, RotateCw, Share2, Layers, Mail,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  getDocumentSelectionExcludedIds,
  serializeDocumentSelection,
  type DocumentSelection,
} from "@/lib/document-selection"
import { ShareLinkBundleCreateDialog } from "@/components/share-links/share-link-bundles-panel"
import { MergeAsVersionsDialog } from "@/components/documents/merge-as-versions-dialog"
import { EmailDocumentsDialog } from "@/components/documents/email-documents-dialog"
import { MixedSelectionPicker } from "@/components/documents/mixed-selection-picker"
import {
  buildToggleMap,
  getSingleValueFieldState,
  normalizeSelectionData,
  type SelectionData,
  type SingleValueFieldState,
  type TriState,
} from "@/lib/bulk-selection-data"

interface BulkActionBarProps {
  selection: DocumentSelection
  selectedCount: number
  totalResultsCount: number
  selectionData?: SelectionData | null
  onClearSelection: () => void
  onComplete: () => void
  onSelectAllFiltered?: () => void
  remoteOcrSelectable?: boolean
  tags: { id: number; name: string; color: string | number; parent?: number | null }[]
  correspondents: { id: number; name: string }[]
  documentTypes: { id: number; name: string }[]
  storagePaths: { id: number; name: string }[]
  customFields?: { id: number; name: string; data_type: string }[]
  usersList?: { id: number; username: string }[]
  groupsList?: { id: number; name: string }[]
  documentTitles?: Array<{ id: number; title?: string | null }>
  paperlessBaseUrl?: string
}

type BulkEditParameters = Record<string, unknown>
type SelectableActor = { id: number; username?: string; name?: string }

function assertNever(value: never): never {
  throw new Error(`Unhandled selection state: ${String(value)}`)
}

async function bulkEdit(
  selection: DocumentSelection,
  method: string,
  parameters: BulkEditParameters
) {
  const excludedDocumentIds = getDocumentSelectionExcludedIds(selection)
  const res = await fetch("/api/bulk-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...serializeDocumentSelection(selection),
      ...(excludedDocumentIds.length > 0
        ? { excluded_document_ids: excludedDocumentIds }
        : {}),
      method,
      parameters,
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Bulk edit failed: ${err}`)
  }
  return res.json()
}

async function bulkDownload(documentIds: number[]) {
  const res = await fetch("/api/bulk-download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documents: documentIds, content: "both" }),
  })
  if (!res.ok) throw new Error("Download failed")
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `documents-${Date.now()}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

async function proxyPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/proxy/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(err)
  }
  return res.json().catch(() => null)
}

async function loadSelectionData(selection: DocumentSelection) {
  const excludedDocumentIds = getDocumentSelectionExcludedIds(selection)
  const res = await fetch("/api/documents/selection-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...serializeDocumentSelection(selection),
      ...(excludedDocumentIds.length > 0
        ? { excluded_document_ids: excludedDocumentIds }
        : {}),
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Selection data failed: ${err}`)
  }

  return normalizeSelectionData(await res.json().catch(() => null))
}

function buildTriStateDelta(
  initialStateById: Record<number, TriState>,
  nextStateById: Record<number, TriState>
) {
  const ids = new Set([
    ...Object.keys(initialStateById).map(Number),
    ...Object.keys(nextStateById).map(Number),
  ])
  const itemsToAdd: number[] = []
  const itemsToRemove: number[] = []

  for (const id of ids) {
    const initialState = initialStateById[id] ?? "unselected"
    const nextState = nextStateById[id] ?? "unselected"

    if (nextState === "partial") {
      continue
    }

    if (nextState === "selected" && initialState !== "selected") {
      itemsToAdd.push(id)
    }

    if (nextState === "unselected" && initialState !== "unselected") {
      itemsToRemove.push(id)
    }
  }

  return {
    itemsToAdd,
    itemsToRemove,
  }
}

function singleValueButtonLabel(
  label: string,
  state: SingleValueFieldState,
  items: Array<{ id: number; name: string }>
) {
  switch (state.state) {
    case "selected": {
      const match = items.find((item) => item.id === state.value)
      return match ? `${label}: ${match.name}` : label
    }
    case "partial":
      return `${label}: Mixed`
    case "unselected":
      return label
    default:
      return assertNever(state.state)
  }
}

function parseCustomFieldValue(
  dataType: string,
  value: string
): boolean | number | string {
  if (dataType === "boolean") {
    return value === "true"
  }

  if (
    dataType === "float" ||
    dataType === "integer" ||
    dataType === "monetary"
  ) {
    return Number(value)
  }

  return value
}

// Multi-select combobox for users/groups
function MultiSelectCombobox({
  items,
  selected,
  onChange,
  placeholder,
  labelKey = "username",
}: {
  items: SelectableActor[]
  selected: number[]
  onChange: (ids: number[]) => void
  placeholder: string
  labelKey?: "username" | "name"
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8">
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
                    <Check className={cn("mr-2 h-3 w-3", isSelected ? "opacity-100" : "opacity-0")} />
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

export function BulkActionBar({
  selection,
  selectedCount,
  totalResultsCount,
  selectionData = null,
  onClearSelection,
  onComplete,
  onSelectAllFiltered,
  remoteOcrSelectable = false,
  tags,
  correspondents,
  documentTypes,
  storagePaths,
  customFields = [],
  usersList = [],
  groupsList = [],
  documentTitles = [],
  paperlessBaseUrl = "/",
}: BulkActionBarProps) {
  const [showDelete, setShowDelete] = React.useState(false)
  const [showMerge, setShowMerge] = React.useState(false)
  const [showMergeAsVersions, setShowMergeAsVersions] = React.useState(false)
  const [showBundle, setShowBundle] = React.useState(false)
  const [showEmail, setShowEmail] = React.useState(false)
  const [showPermissions, setShowPermissions] = React.useState(false)
  const [showCustomFields, setShowCustomFields] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [selectionDataLoading, setSelectionDataLoading] = React.useState(false)

  const [initialTagStateById, setInitialTagStateById] = React.useState<
    Record<number, TriState>
  >({})
  const [tagStateById, setTagStateById] = React.useState<Record<number, TriState>>({})
  const [correspondentState, setCorrespondentState] =
    React.useState<SingleValueFieldState>({
      state: "unselected",
      value: null,
    })
  const [documentTypeState, setDocumentTypeState] =
    React.useState<SingleValueFieldState>({
      state: "unselected",
      value: null,
    })
  const [storagePathState, setStoragePathState] =
    React.useState<SingleValueFieldState>({
      state: "unselected",
      value: null,
    })

  // Permissions dialog state
  const [permOwner, setPermOwner] = React.useState<number | null>(null)
  const [permViewUsers, setPermViewUsers] = React.useState<number[]>([])
  const [permViewGroups, setPermViewGroups] = React.useState<number[]>([])
  const [permChangeUsers, setPermChangeUsers] = React.useState<number[]>([])
  const [permChangeGroups, setPermChangeGroups] = React.useState<number[]>([])
  const [permMerge, setPermMerge] = React.useState(false)

  // Custom field dialog state
  const [cfFieldId, setCfFieldId] = React.useState<string>("")
  const [cfValue, setCfValue] = React.useState<string>("")

  // Merge dialog state
  const [mergeDeleteOriginals, setMergeDeleteOriginals] = React.useState(false)

  const explicitDocumentIds =
    selection.type === "explicit"
      ? selection.documentIds
      : []
  const excludedCount =
    selection.type === "all-filtered"
      ? selection.excludedDocumentIds.length
      : 0
  const count = selectedCount
  const supportsExplicitOnlyActions = selection.type === "explicit"
  const selectionKey = React.useMemo(
    () =>
      JSON.stringify({
        ...serializeDocumentSelection(selection),
        excluded_document_ids: getDocumentSelectionExcludedIds(selection),
        selectedCount,
      }),
    [selectedCount, selection]
  )

  React.useEffect(() => {
    let cancelled = false

    const resetEditorState = () => {
      setInitialTagStateById({})
      setTagStateById({})
      setCorrespondentState({ state: "unselected", value: null })
      setDocumentTypeState({ state: "unselected", value: null })
      setStoragePathState({ state: "unselected", value: null })
      setCfFieldId("")
      setCfValue("")
    }

    const applySelectionData = (nextSelectionData: SelectionData | null) => {
      const normalized = normalizeSelectionData(nextSelectionData)
      setInitialTagStateById(buildToggleMap(normalized.selected_tags, selectedCount))
      setTagStateById(buildToggleMap(normalized.selected_tags, selectedCount))
      setCorrespondentState(
        getSingleValueFieldState(
          normalized.selected_correspondents,
          selectedCount
        )
      )
      setDocumentTypeState(
        getSingleValueFieldState(
          normalized.selected_document_types,
          selectedCount
        )
      )
      setStoragePathState(
        getSingleValueFieldState(
          normalized.selected_storage_paths,
          selectedCount
        )
      )
    }

    resetEditorState()

    const usePageSelectionData =
      selection.type === "all-filtered" &&
      selection.excludedDocumentIds.length === 0 &&
      selectionData != null

    if (usePageSelectionData) {
      applySelectionData(selectionData)
      setSelectionDataLoading(false)
      return () => {
        cancelled = true
      }
    }

    setSelectionDataLoading(true)
    void loadSelectionData(selection)
      .then((nextSelectionData) => {
        if (cancelled) {
          return
        }

        applySelectionData(nextSelectionData)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        toast.error("Could not load selection details", {
          description:
            error instanceof Error ? error.message : "Unknown selection error",
        })
      })
      .finally(() => {
        if (!cancelled) {
          setSelectionDataLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedCount, selection, selectionData, selectionKey])

  if (count === 0) return null

  const actionsDisabled = busy || selectionDataLoading

  const run = async (method: string, parameters: BulkEditParameters, message: string) => {
    setBusy(true)
    try {
      await bulkEdit(selection, method, parameters)
      toast.success(message)
      onComplete()
    } catch (error) {
      toast.error("Bulk operation failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setBusy(false)
    }
  }

  const handleSetCorrespondent = async (id: number | null) => {
    await run("set_correspondent", { correspondent: id }, `Correspondent ${id ? "set" : "cleared"} on ${count} documents`)
  }

  const handleSetDocumentType = async (id: number | null) => {
    await run("set_document_type", { document_type: id }, `Document type ${id ? "set" : "cleared"} on ${count} documents`)
  }

  const handleSetStoragePath = async (id: number | null) => {
    await run("set_storage_path", { storage_path: id }, `Storage path ${id ? "set" : "cleared"} on ${count} documents`)
  }

  const handleSetTags = async () => {
    const { itemsToAdd, itemsToRemove } = buildTriStateDelta(
      initialTagStateById,
      tagStateById
    )

    if (itemsToAdd.length === 0 && itemsToRemove.length === 0) {
      return
    }

    await run(
      "modify_tags",
      {
        add_tags: itemsToAdd,
        remove_tags: itemsToRemove,
      },
      `Tags updated on ${count} documents`
    )
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await bulkEdit(selection, "delete", {})
      toast.success(`${count} document(s) moved to trash`)
      onComplete()
    } catch (error) {
      toast.error("Delete failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setBusy(false)
      setShowDelete(false)
    }
  }

  const handleDownload = async () => {
    if (!supportsExplicitOnlyActions) return
    setBusy(true)
    try {
      await bulkDownload(explicitDocumentIds)
      toast.success("Download started")
    } catch (error) {
      toast.error("Download failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setBusy(false)
    }
  }

  const handleRedoOcr = async (remoteOcr = false) => {
    await run(
      "redo_ocr",
      { remote_ocr: remoteOcr },
      remoteOcr
        ? `Remote OCR reprocessing started on ${count} documents`
        : `OCR reprocessing started on ${count} documents`
    )
  }

  const handleRotate = async (degrees: number) => {
    setBusy(true)
    try {
      await bulkEdit(selection, "rotate", { degrees })
      toast.success(`Rotated ${count} document(s) by ${degrees}°`)
      onComplete()
    } catch (error) {
      toast.error("Rotate failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setBusy(false)
    }
  }

  const handleMerge = async () => {
    if (!supportsExplicitOnlyActions) return
    setBusy(true)
    try {
      await proxyPost("documents/merge/", {
        documents: explicitDocumentIds,
        delete_originals: mergeDeleteOriginals,
      })
      toast.success(`Merging ${count} documents…`)
      setShowMerge(false)
      onComplete()
    } catch (error) {
      toast.error("Merge failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setBusy(false)
    }
  }

  const handleSavePermissions = async () => {
    setBusy(true)
    try {
      await bulkEdit(selection, "set_permissions", {
        owner: permOwner,
        set_permissions: {
          view: { users: permViewUsers, groups: permViewGroups },
          change: { users: permChangeUsers, groups: permChangeGroups },
        },
        merge: permMerge,
      })
      toast.success(`Permissions updated on ${count} documents`)
      setShowPermissions(false)
      onComplete()
    } catch (error) {
      toast.error("Permissions update failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setBusy(false)
    }
  }

  const handleSaveCustomField = async () => {
    if (!cfFieldId) return
    const customFieldId = Number(cfFieldId)
    const trimmedValue = cfValue.trim()

    setBusy(true)
    try {
      await bulkEdit(selection, "modify_custom_fields", trimmedValue
        ? {
            add_custom_fields: {
              [customFieldId]: parseCustomFieldValue(
                selectedField?.data_type ?? "text",
                trimmedValue
              ),
            },
            remove_custom_fields: [],
          }
        : {
            add_custom_fields: {},
            remove_custom_fields: [customFieldId],
          })
      toast.success(`Custom field updated on ${count} documents`)
      setShowCustomFields(false)
      setCfFieldId("")
      setCfValue("")
      onComplete()
    } catch (error) {
      toast.error("Custom field update failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setBusy(false)
    }
  }

  const selectedField = customFields.find((cf) => String(cf.id) === cfFieldId)
  const tagChanges = buildTriStateDelta(initialTagStateById, tagStateById)
  const activeTagCount = Object.values(tagStateById).filter(
    (state) => state !== "unselected"
  ).length
  const correspondentButtonText = singleValueButtonLabel(
    "Correspondent",
    correspondentState,
    correspondents
  )
  const documentTypeButtonText = singleValueButtonLabel(
    "Type",
    documentTypeState,
    documentTypes
  )
  const storagePathButtonText = singleValueButtonLabel(
    "Storage Path",
    storagePathState,
    storagePaths
  )

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-lg">
        <Badge variant="secondary" className="font-mono text-xs">
          {count} selected
        </Badge>
        {selection.type === "all-filtered" && excludedCount > 0 ? (
          <span className="text-xs text-muted-foreground">
            {excludedCount} excluded
          </span>
        ) : null}
        {onSelectAllFiltered && selection.type === "explicit" && totalResultsCount > count ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onSelectAllFiltered}
          >
            Select all {totalResultsCount.toLocaleString()} documents
          </Button>
        ) : null}

        {/* Set Tags */}
        <CanChange type="document">
          <div className="flex items-center gap-1">
            <MixedSelectionPicker
              tags={tags}
              stateById={tagStateById}
              onStateByIdChange={setTagStateById}
              placeholder="Tags"
              disabled={actionsDisabled}
              className="min-h-7 w-[180px] py-0 text-xs"
            />
            {tagChanges.itemsToAdd.length > 0 || tagChanges.itemsToRemove.length > 0 ? (
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={actionsDisabled}
                onClick={handleSetTags}
              >
                Apply tags ({activeTagCount})
              </Button>
            ) : null}
          </div>
        </CanChange>

        {/* Set Correspondent */}
        <CanChange type="document">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={actionsDisabled}>
                <User className="mr-1 h-3 w-3" />{correspondentButtonText}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-60 overflow-y-auto">
              <DropdownMenuItem onClick={() => handleSetCorrespondent(null)}>
                <em className="text-muted-foreground">Clear</em>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {correspondents.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => handleSetCorrespondent(c.id)}>
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CanChange>

        {/* Set Document Type */}
        <CanChange type="document">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={actionsDisabled}>
                <FileType className="mr-1 h-3 w-3" />{documentTypeButtonText}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-60 overflow-y-auto">
              <DropdownMenuItem onClick={() => handleSetDocumentType(null)}>
                <em className="text-muted-foreground">Clear</em>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {documentTypes.map((dt) => (
                <DropdownMenuItem key={dt.id} onClick={() => handleSetDocumentType(dt.id)}>
                  {dt.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CanChange>

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={actionsDisabled}>
              More…
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <CanChange type="document">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderOpen className="mr-2 h-3.5 w-3.5" />{storagePathButtonText}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                  <DropdownMenuItem onClick={() => handleSetStoragePath(null)}>
                    <em className="text-muted-foreground">Clear</em>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {storagePaths.map((sp) => (
                    <DropdownMenuItem key={sp.id} onClick={() => handleSetStoragePath(sp.id)}>
                      {sp.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </CanChange>

            <CanChange type="document">
              {customFields.length > 0 && (
                <DropdownMenuItem onClick={() => setShowCustomFields(true)} disabled={actionsDisabled}>
                  <FormInput className="mr-2 h-3.5 w-3.5" />Custom Field…
                </DropdownMenuItem>
              )}
            </CanChange>

            <CanChange type="document">
              {usersList.length > 0 && (
                <DropdownMenuItem onClick={() => setShowPermissions(true)} disabled={actionsDisabled}>
                  <ShieldCheck className="mr-2 h-3.5 w-3.5" />Permissions…
                </DropdownMenuItem>
              )}
            </CanChange>

            <DropdownMenuSeparator />

            <CanChange type="document">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <RotateCw className="mr-2 h-3.5 w-3.5" />Rotate
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleRotate(90)}>90° clockwise</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRotate(180)}>180°</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRotate(270)}>90° counter-clockwise</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </CanChange>

            <CanChange type="document">
              {supportsExplicitOnlyActions && count >= 2 && (
                <DropdownMenuItem onClick={() => setShowMerge(true)} disabled={actionsDisabled}>
                  <Merge className="mr-2 h-3.5 w-3.5" />Merge PDFs…
                </DropdownMenuItem>
              )}
              {supportsExplicitOnlyActions && count >= 2 && (
                <DropdownMenuItem
                  onClick={() => setShowMergeAsVersions(true)}
                  disabled={actionsDisabled}
                >
                  <Layers className="mr-2 h-3.5 w-3.5" />Merge as versions…
                </DropdownMenuItem>
              )}
            </CanChange>
            {supportsExplicitOnlyActions && (
              <DropdownMenuItem onClick={() => setShowBundle(true)} disabled={actionsDisabled}>
                <Share2 className="mr-2 h-3.5 w-3.5" />Create share bundle…
              </DropdownMenuItem>
            )}
            {supportsExplicitOnlyActions ? (
              <DropdownMenuItem onClick={() => setShowEmail(true)} disabled={actionsDisabled}>
                <Mail className="mr-2 h-3.5 w-3.5" />Email documents…
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>
                <Mail className="mr-2 h-3.5 w-3.5" />
                Email requires an explicit selection
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleDownload} disabled={actionsDisabled || !supportsExplicitOnlyActions}>
              <Download className="mr-2 h-3.5 w-3.5" />Download
            </DropdownMenuItem>
            <CanChange type="document">
              <DropdownMenuItem onClick={() => void handleRedoOcr()} disabled={actionsDisabled}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" />Redo OCR
              </DropdownMenuItem>
              {remoteOcrSelectable ? (
                <DropdownMenuItem
                  onClick={() => void handleRedoOcr(true)}
                  disabled={actionsDisabled}
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />Redo OCR with Remote OCR
                </DropdownMenuItem>
              ) : null}
            </CanChange>
            <DropdownMenuSeparator />
            <CanDelete type="document">
              <DropdownMenuItem onClick={() => setShowDelete(true)} disabled={actionsDisabled} className="text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
              </DropdownMenuItem>
            </CanDelete>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={onClearSelection}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Delete confirmation */}
      <CanDelete type="document">
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {count} document(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                This will move the selected documents to trash. You can recover them from the Trash page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CanDelete>

      {/* Merge confirmation */}
      <CanChange type="document">
        <AlertDialog open={showMerge} onOpenChange={setShowMerge}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Merge {count} documents?</AlertDialogTitle>
              <AlertDialogDescription>
                This will combine the selected documents into one. A new document will be created with all pages merged in selection order.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex items-center gap-2 px-1 py-2">
              <Switch
                id="delete-originals"
                checked={mergeDeleteOriginals}
                onCheckedChange={setMergeDeleteOriginals}
              />
              <Label htmlFor="delete-originals" className="text-sm">Delete original documents after merging</Label>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleMerge} disabled={actionsDisabled}>
                Merge
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CanChange>

      <CanChange type="document">
        <MergeAsVersionsDialog
          open={showMergeAsVersions}
          onOpenChange={setShowMergeAsVersions}
          documents={
            documentTitles.length > 0
              ? documentTitles.filter((doc) =>
                  explicitDocumentIds.includes(doc.id)
                )
              : explicitDocumentIds.map((id) => ({ id, title: `Document ${id}` }))
          }
          onComplete={onComplete}
        />
      </CanChange>

      <ShareLinkBundleCreateDialog
        open={showBundle}
        onOpenChange={setShowBundle}
        documentIds={explicitDocumentIds}
        paperlessBaseUrl={paperlessBaseUrl}
      />

      <EmailDocumentsDialog
        open={showEmail}
        onOpenChange={setShowEmail}
        documentIds={explicitDocumentIds}
        documentLabel={
          count === 1
            ? documentTitles.find((doc) => doc.id === explicitDocumentIds[0])?.title ||
              `Document ${explicitDocumentIds[0]}`
            : `${count} selected documents`
        }
        hasArchiveVersion
      />

      {/* Permissions dialog */}
      <CanChange type="document">
        <Dialog open={showPermissions} onOpenChange={setShowPermissions}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Set permissions on {count} document(s)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Owner</Label>
                <Select
                  value={permOwner != null ? String(permOwner) : "none"}
                  onValueChange={(v) => setPermOwner(v === "none" ? null : Number(v))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="No owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none"><em className="text-muted-foreground">No owner</em></SelectItem>
                    {usersList.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">View Access</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Users</Label>
                    <MultiSelectCombobox items={usersList} selected={permViewUsers} onChange={setPermViewUsers} placeholder="Select users…" labelKey="username" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Groups</Label>
                    <MultiSelectCombobox items={groupsList} selected={permViewGroups} onChange={setPermViewGroups} placeholder="Select groups…" labelKey="name" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">Edit Access</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Users</Label>
                    <MultiSelectCombobox items={usersList} selected={permChangeUsers} onChange={setPermChangeUsers} placeholder="Select users…" labelKey="username" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Groups</Label>
                    <MultiSelectCombobox items={groupsList} selected={permChangeGroups} onChange={setPermChangeGroups} placeholder="Select groups…" labelKey="name" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch id="perm-merge" checked={permMerge} onCheckedChange={setPermMerge} />
                <Label htmlFor="perm-merge" className="text-xs">Merge with existing permissions (instead of replacing)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPermissions(false)}>Cancel</Button>
              <Button onClick={handleSavePermissions} disabled={actionsDisabled}>
                Apply Permissions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CanChange>

      {/* Custom field dialog */}
      <CanChange type="document">
        <Dialog open={showCustomFields} onOpenChange={setShowCustomFields}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Set custom field on {count} document(s)</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Field</Label>
                <Select value={cfFieldId} onValueChange={(v) => { setCfFieldId(v); setCfValue("") }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select a field…" />
                  </SelectTrigger>
                  <SelectContent>
                    {customFields.map((cf) => (
                      <SelectItem key={cf.id} value={String(cf.id)}>{cf.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedField && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Value</Label>
                  {selectedField.data_type === "boolean" ? (
                    <Select value={cfValue} onValueChange={setCfValue}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : selectedField.data_type === "long_text" ? (
                    <Textarea
                      className="min-h-24 text-xs"
                      placeholder="Enter long text value…"
                      value={cfValue}
                      onChange={(event) => setCfValue(event.target.value)}
                    />
                  ) : (
                    <Input
                      className="h-8 text-xs"
                      type={selectedField.data_type === "integer" || selectedField.data_type === "float" || selectedField.data_type === "monetary" ? "number" : selectedField.data_type === "date" ? "date" : "text"}
                      placeholder={`Enter ${selectedField.data_type} value…`}
                      value={cfValue}
                      onChange={(e) => setCfValue(e.target.value)}
                    />
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomFields(false)}>Cancel</Button>
              <Button onClick={handleSaveCustomField} disabled={actionsDisabled || !cfFieldId}>
                Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CanChange>
    </>
  )
}
