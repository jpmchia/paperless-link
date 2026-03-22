"use client"

import * as React from "react"
import { useConfirmationDialog } from "@/components/confirmation-dialog-provider"
import { CanCreate } from "@/components/permissions/can-create"
import { HasObjectPermission } from "@/components/permissions/has-object-permission"
import { useUnsavedChanges } from "@/lib/use-unsaved-changes"
import { useRouter, usePathname } from "next/navigation"
import { useAtom } from "jotai"
import { filterParamsAtom, activeFilterCountAtom } from "@/lib/store"
import type { FilterParams } from "@/lib/api"
import type { PermissionedObject } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, X, ChevronDown, Tag, User, FileType, Calendar, SortAsc, LayoutList, Save, SaveAll, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { patchSavedView, createSavedView } from "./saved-view-actions"
import {
  getComparableSavedViewStateFromFilters,
  getComparableSavedViewStateFromView,
  isSavedViewDirty,
  orderingToSavedViewSort,
} from "./saved-view-state"
import { tagColourHex } from "@/lib/tag-colors"
import type { DocumentDisplayMode } from "./display-mode"
import {
  SavedViewEditor,
  type SavedViewEditorValue,
} from "@/components/saved-views/saved-view-editor"
import type { SavedViewRuleEditorLookups } from "@/components/saved-views/filter-rule-editor"

type ActiveSavedView = PermissionedObject & {
  filter_rules?: Array<{ rule_type?: number; value?: string | number | boolean | null }>
  id?: number
  name?: string
  sort_field?: string | null
  sort_reverse?: boolean | null
  display_mode?: string | null
  display_fields?: string[] | null
  page_size?: number | null
}

interface FilterPanelProps {
  correspondents: any[]
  documentTypes: any[]
  storagePaths: any[]
  tags: any[]
  users?: Array<{ id: number; username?: string; first_name?: string; last_name?: string }>
  savedViews: any[]
  activeViewId?: number | null
  activeViewName?: string | null
  activeView?: ActiveSavedView | null
  initialFilters?: FilterParams
  onFilterChange?: (params: FilterParams) => void
  currentUserId?: number | null
  currentDisplayMode?: DocumentDisplayMode
  currentDisplayFields?: string[]
  currentPageSize?: number
  extraDirty?: boolean
  onSaveExtras?: () => Promise<void>
  onCreateViewExtras?: (createdViewId: number) => Promise<void>
  trailingControls?: React.ReactNode
}

const SORT_OPTIONS = [
  { label: "Title A–Z", value: "title" },
  { label: "Title Z–A", value: "-title" },
  { label: "Created (newest)", value: "-created" },
  { label: "Created (oldest)", value: "created" },
  { label: "Added (newest)", value: "-added" },
  { label: "Added (oldest)", value: "added" },
  { label: "Correspondent A–Z", value: "correspondent__name" },
  { label: "ASN (low–high)", value: "archive_serial_number" },
  { label: "ASN (high–low)", value: "-archive_serial_number" },
]

type TagFilterMode = "all" | "any" | "not"

const DATE_PRESETS = [
  { id: "within-1-week", label: "Within 1 week" },
  { id: "within-1-month", label: "Within 1 month" },
  { id: "within-3-months", label: "Within 3 months" },
  { id: "within-1-year", label: "Within 1 year" },
  { id: "this-month", label: "This month" },
  { id: "this-year", label: "This year" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
] as const

type DatePresetId = (typeof DATE_PRESETS)[number]["id"]
type DateTarget = "created" | "added"

function toIsoDate(date: Date) {
  return date.toISOString().split("T")[0]
}

function getDatePresetRange(preset: DatePresetId) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  switch (preset) {
    case "within-1-week": {
      const from = new Date(today)
      from.setDate(from.getDate() - 7)
      return { from: toIsoDate(from), to: toIsoDate(today) }
    }
    case "within-1-month": {
      const from = new Date(today)
      from.setMonth(from.getMonth() - 1)
      return { from: toIsoDate(from), to: toIsoDate(today) }
    }
    case "within-3-months": {
      const from = new Date(today)
      from.setMonth(from.getMonth() - 3)
      return { from: toIsoDate(from), to: toIsoDate(today) }
    }
    case "within-1-year": {
      const from = new Date(today)
      from.setFullYear(from.getFullYear() - 1)
      return { from: toIsoDate(from), to: toIsoDate(today) }
    }
    case "this-month":
      return { from: toIsoDate(startOfMonth), to: toIsoDate(today) }
    case "this-year":
      return { from: toIsoDate(startOfYear), to: toIsoDate(today) }
    case "today":
      return { from: toIsoDate(today), to: toIsoDate(today) }
    case "yesterday": {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return { from: toIsoDate(yesterday), to: toIsoDate(yesterday) }
    }
  }
}

export function FilterPanel({
  correspondents,
  documentTypes,
  storagePaths,
  tags,
  users = [],
  savedViews,
  activeViewId,
  activeViewName,
  activeView,
  initialFilters = {},
  onFilterChange,
  currentUserId,
  currentDisplayMode,
  currentDisplayFields = [],
  currentPageSize = 25,
  extraDirty = false,
  onSaveExtras,
  onCreateViewExtras,
  trailingControls,
}: FilterPanelProps) {
  // Use local state as the primary state driver (not the stale Jotai atom)
  // This avoids localStorage clobbering server-derived view filters on hydration
  const [filters, setLocalFilters] = React.useState<FilterParams>(initialFilters)
  const [, setAtomFilters] = useAtom(filterParamsAtom)
  const [filterCount] = useAtom(activeFilterCountAtom)
  const [searchValue, setSearchValue] = React.useState(initialFilters.query || "")
  const [suggestions, setSuggestions] = React.useState<string[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = React.useState(false)
  const autocompleteTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tagMode, setTagMode] = React.useState<TagFilterMode>("all")
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editorIsNew, setEditorIsNew] = React.useState(false)
  const [editorValue, setEditorValue] = React.useState<SavedViewEditorValue | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [savedViewBaseline, setSavedViewBaseline] = React.useState(() =>
    getComparableSavedViewStateFromView(activeView)
  )
  const router = useRouter()
  const pathname = usePathname()
  const { confirm } = useConfirmationDialog()

  const currentSavedViewState = getComparableSavedViewStateFromFilters(
    filters,
    currentDisplayMode,
    currentDisplayFields,
    currentPageSize
  )
  const activeViewStateDirty = isSavedViewDirty(
    filters,
    savedViewBaseline,
    currentDisplayMode,
    currentDisplayFields,
    currentPageSize
  )
  const activeViewIsDirty = activeViewStateDirty || extraDirty
  const savedViewLookups = React.useMemo<SavedViewRuleEditorLookups>(
    () => ({
      correspondents,
      documentTypes,
      storagePaths,
      tags,
      users,
      customFields: [],
    }),
    [correspondents, documentTypes, storagePaths, tags, users]
  )

  // Keep Jotai atom in sync for cross-component use (e.g. document detail Next/Prev)
  React.useEffect(() => {
    setAtomFilters(filters)
  }, [filters, setAtomFilters])

  React.useEffect(() => {
    setSavedViewBaseline(getComparableSavedViewStateFromView(activeView))
  }, [activeView])

  // When searchValue changes externally (view switch) reset search bar
  React.useEffect(() => {
    setSearchValue(filters.query || "")
  }, [filters.query])

  useUnsavedChanges(Boolean(activeViewId && activeViewIsDirty))

  const applyFilters = React.useCallback(
    (updated: FilterParams) => {
      setLocalFilters(updated)
      setAtomFilters(updated)
      onFilterChange?.(updated)
      // Reflect changes in URL so pages are shareable
      const params = new URLSearchParams()
      if (activeViewId) params.set("view", String(activeViewId))
      if (updated.query) params.set("query", updated.query)
      if (updated.correspondent) params.set("correspondent", String(updated.correspondent))
      if (updated.documentType) params.set("document_type", String(updated.documentType))
      if (updated.storagePath) params.set("storage_path", String(updated.storagePath))
      if (updated.tags?.length) params.set("tags", updated.tags.join(","))
      if (updated.tagsExclude?.length) params.set("tags_exclude", updated.tagsExclude.join(","))
      if (updated.createdAfter) params.set("created_after", updated.createdAfter)
      if (updated.createdBefore) params.set("created_before", updated.createdBefore)
      if (updated.addedAfter) params.set("added_after", updated.addedAfter)
      if (updated.addedBefore) params.set("added_before", updated.addedBefore)
      if (updated.owner != null) params.set("owner", String(updated.owner))
      if (updated.ownerAny?.length) params.set("owner_any", updated.ownerAny.join(","))
      if (updated.ownerExclude?.length) params.set("owner_exclude", updated.ownerExclude.join(","))
      if (updated.ownerIsNull != null) params.set("owner_is_null", String(updated.ownerIsNull))
      if (updated.sharedByUser != null) params.set("shared_by_user", String(updated.sharedByUser))
      if (updated.ordering) params.set("ordering", updated.ordering)
      const qs = params.toString()
      router.push(`${pathname}${qs ? `?${qs}` : ""}`)
    },
    [setLocalFilters, setAtomFilters, onFilterChange, router, pathname, activeViewId]
  )

  const loadSavedView = async (view: any) => {
    if (activeViewId && activeViewIsDirty) {
      const confirmed = await confirm({
        actionLabel: "Discard changes",
        description: `Discard unsaved changes to "${activeViewName}"?`,
        cancelLabel: "Keep editing",
        title: "Switch saved view?",
      })
      if (!confirmed) return
    }
    router.push(`/documents?view=${view.id}`)
  }

  const buildEditorValueFromCurrentState = React.useCallback(
    (name: string, id?: number) => {
      const sortParts = orderingToSavedViewSort(filters.ordering)
      return {
        id,
        name,
        show_on_dashboard: false,
        show_in_sidebar: false,
        filter_rules: currentSavedViewState.filterRules,
        sort_field: sortParts.sortField,
        sort_reverse: sortParts.sortReverse,
        display_mode: currentSavedViewState.displayMode,
        display_fields: currentSavedViewState.displayFields,
        page_size: currentSavedViewState.pageSize,
      } satisfies SavedViewEditorValue
    },
    [currentSavedViewState, filters.ordering]
  )

  const buildEditorValueFromActiveView = React.useCallback(() => {
    return {
      ...buildEditorValueFromCurrentState(activeViewName ?? "Saved view", activeViewId ?? undefined),
      show_on_dashboard: Boolean((activeView as { show_on_dashboard?: boolean } | null | undefined)?.show_on_dashboard),
      show_in_sidebar: Boolean((activeView as { show_in_sidebar?: boolean } | null | undefined)?.show_in_sidebar),
    } satisfies SavedViewEditorValue
  }, [activeView, activeViewId, activeViewName, buildEditorValueFromCurrentState])

  const navigateToSavedView = React.useCallback(
    (viewId: number) => {
      if (pathname.startsWith("/view/")) {
        router.push(`/view/${viewId}`)
        return
      }

      router.push(`/documents?view=${viewId}`)
    },
    [pathname, router]
  )

  const getUserLabel = React.useCallback(
    (userId: number) => {
      const user = users.find((candidate) => candidate.id === userId)
      if (!user) return `#${userId}`

      const fullName = [user.first_name, user.last_name]
        .filter(Boolean)
        .join(" ")
        .trim()

      return fullName || user.username || `#${userId}`
    },
    [users]
  )

  const clearPermissionFilters = React.useCallback(() => {
    applyFilters({
      ...filters,
      owner: undefined,
      ownerAny: undefined,
      ownerExclude: undefined,
      ownerIsNull: undefined,
      sharedByUser: undefined,
    })
  }, [applyFilters, filters])

  const applyPermissionPreset = React.useCallback(
    (preset: "all" | "mine" | "shared-with-me" | "shared-by-me" | "unowned") => {
      const next: FilterParams = {
        ...filters,
        owner: undefined,
        ownerAny: undefined,
        ownerExclude: undefined,
        ownerIsNull: undefined,
        sharedByUser: undefined,
      }

      if (preset === "mine" && currentUserId != null) {
        next.owner = currentUserId
      } else if (preset === "shared-with-me" && currentUserId != null) {
        next.ownerExclude = [currentUserId]
        next.ownerIsNull = false
      } else if (preset === "shared-by-me" && currentUserId != null) {
        next.sharedByUser = currentUserId
      } else if (preset === "unowned") {
        next.ownerIsNull = true
      }

      applyFilters(next)
    },
    [applyFilters, currentUserId, filters]
  )

  const toggleOwnerAny = React.useCallback(
    (userId: number) => {
      const current = filters.ownerAny || []
      const next = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]

      applyFilters({
        ...filters,
        owner: undefined,
        ownerAny: next.length ? next : undefined,
        ownerExclude: undefined,
        ownerIsNull: undefined,
        sharedByUser: undefined,
      })
    },
    [applyFilters, filters]
  )

  const toggleHideUnowned = React.useCallback(
    (checked: boolean) => {
      applyFilters({
        ...filters,
        ownerIsNull: checked ? false : undefined,
      })
    },
    [applyFilters, filters]
  )

  const applyDatePreset = React.useCallback(
    (target: DateTarget, preset: DatePresetId) => {
      const range = getDatePresetRange(preset)

      if (target === "created") {
        applyFilters({
          ...filters,
          createdAfter: range.from,
          createdBefore: range.to,
        })
        return
      }

      applyFilters({
        ...filters,
        addedAfter: range.from,
        addedBefore: range.to,
      })
    },
    [applyFilters, filters]
  )

  const fetchSuggestions = React.useCallback(async (term: string) => {
    if (!term.trim() || term.length < 2) {
      setSuggestions([])
      setSuggestionsOpen(false)
      return
    }
    try {
      const res = await fetch(`/api/proxy/search/autocomplete/?term=${encodeURIComponent(term)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : []
        setSuggestions(list)
        setSuggestionsOpen(list.length > 0)
      }
    } catch {
      // autocomplete errors are non-critical
    }
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchValue(val)
    if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current)
    autocompleteTimer.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchValue(suggestion)
    setSuggestionsOpen(false)
    applyFilters({ ...filters, query: suggestion })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSuggestionsOpen(false)
    applyFilters({ ...filters, query: searchValue || undefined })
  }

  const clearAll = async () => {
    if (activeViewId && activeViewIsDirty) {
      const confirmed = await confirm({
        actionLabel: "Discard changes",
        description: `Discard unsaved changes to "${activeViewName}"?`,
        cancelLabel: "Keep editing",
        title: "Clear filters?",
      })
      if (!confirmed) return
    }

    setLocalFilters({})
    setAtomFilters({})
    if (activeViewId) {
      router.push(`/documents?view=${activeViewId}`)
    } else {
      router.push("/documents")
    }
  }

  const removeChip = (key: keyof FilterParams, value?: number) => {
    const updated = { ...filters }
    if (key === "tags" && value !== undefined) {
      updated.tags = (updated.tags || []).filter((t) => t !== value)
      if (updated.tags.length === 0) delete updated.tags
    } else if (key === "tagsExclude" && value !== undefined) {
      updated.tagsExclude = (updated.tagsExclude || []).filter((t) => t !== value)
      if (updated.tagsExclude.length === 0) delete updated.tagsExclude
    } else if (key === "ownerAny" && value !== undefined) {
      updated.ownerAny = (updated.ownerAny || []).filter((id) => id !== value)
      if (updated.ownerAny.length === 0) delete updated.ownerAny
    } else if (key === "ownerExclude" && value !== undefined) {
      updated.ownerExclude = (updated.ownerExclude || []).filter((id) => id !== value)
      if (updated.ownerExclude.length === 0) delete updated.ownerExclude
    } else {
      delete (updated as any)[key]
    }
    applyFilters(updated)
  }

  const toggleTag = (id: number) => {
    const key = tagMode === "not" ? "tagsExclude" : tagMode === "any" ? "tagsAny" : "tags"
    const current = (filters as any)[key] as number[] || []
    const next = current.includes(id) ? current.filter((t: number) => t !== id) : [...current, id]
    applyFilters({ ...filters, [key]: next.length ? next : undefined })
  }

  const isTagSelected = (id: number) => {
    const key = tagMode === "not" ? "tagsExclude" : tagMode === "any" ? "tagsAny" : "tags"
    return ((filters as any)[key] as number[] || []).includes(id)
  }

  // Save active view
  const handleSaveView = async () => {
    if (!activeViewId || !activeViewIsDirty) return
    setSaving(true)
    try {
      const sortParts = orderingToSavedViewSort(filters.ordering)
      await patchSavedView(activeViewId, {
        filter_rules: currentSavedViewState.filterRules,
        sort_field: sortParts.sortField,
        sort_reverse: sortParts.sortReverse,
        display_mode: currentSavedViewState.displayMode,
        display_fields: currentSavedViewState.displayFields,
        page_size: currentSavedViewState.pageSize,
      })
      if (onSaveExtras) {
        await onSaveExtras()
      }
      setSavedViewBaseline(currentSavedViewState)
      toast.success(`View "${activeViewName}" saved`)
    } catch (e: any) {
      toast.error("Failed to save view", { description: e.message })
    } finally {
      setSaving(false)
    }
  }

  const handleEditorSave = async () => {
    if (!editorValue?.name.trim()) return
    setSaving(true)
    try {
      if (editorIsNew) {
        const created = await createSavedView({
          name: editorValue.name.trim(),
          filter_rules: editorValue.filter_rules,
          sort_field: editorValue.sort_field,
          sort_reverse: editorValue.sort_reverse,
          display_mode: editorValue.display_mode,
          display_fields: editorValue.display_fields,
          page_size: editorValue.page_size ?? undefined,
          show_on_dashboard: editorValue.show_on_dashboard,
          show_in_sidebar: editorValue.show_in_sidebar,
        })
        if (onCreateViewExtras) {
          await onCreateViewExtras(created.id)
        }
        toast.success(`View "${editorValue.name}" created`)
        setEditorOpen(false)
        setEditorValue(null)
        navigateToSavedView(created.id)
        return
      }

      if (!editorValue.id) {
        throw new Error("Saved view id is missing")
      }

      await patchSavedView(editorValue.id, {
        name: editorValue.name.trim(),
        filter_rules: editorValue.filter_rules,
        sort_field: editorValue.sort_field,
        sort_reverse: editorValue.sort_reverse,
        display_mode: editorValue.display_mode,
        display_fields: editorValue.display_fields,
        page_size: editorValue.page_size ?? undefined,
        show_on_dashboard: editorValue.show_on_dashboard,
        show_in_sidebar: editorValue.show_in_sidebar,
      })
      if (onSaveExtras) {
        await onSaveExtras()
      }
      setSavedViewBaseline({
        filterRules: editorValue.filter_rules,
        sortField: editorValue.sort_field,
        sortReverse: editorValue.sort_reverse,
        displayMode: editorValue.display_mode ?? currentSavedViewState.displayMode,
        displayFields: editorValue.display_fields,
        pageSize: editorValue.page_size ?? currentSavedViewState.pageSize,
      })
      toast.success(`View "${editorValue.name}" updated`)
      setEditorOpen(false)
      setEditorValue(null)
      navigateToSavedView(editorValue.id)
    } catch (e: any) {
      toast.error(editorIsNew ? "Failed to create view" : "Failed to save view", {
        description: e.message,
      })
    } finally {
      setSaving(false)
    }
  }

  // ---- Active filter chips ----
  const chips: { label: string; onRemove: () => void }[] = []
  if (filters.query) chips.push({ label: `Search: "${filters.query}"`, onRemove: () => removeChip("query") })
  if (filters.correspondent) {
    const c = correspondents.find((x: any) => x.id === filters.correspondent)
    chips.push({ label: `From: ${c?.name ?? filters.correspondent}`, onRemove: () => removeChip("correspondent") })
  }
  if (filters.documentType) {
    const dt = documentTypes.find((x: any) => x.id === filters.documentType)
    chips.push({ label: `Type: ${dt?.name ?? filters.documentType}`, onRemove: () => removeChip("documentType") })
  }
  if (filters.storagePath) {
    const sp = storagePaths.find((x: any) => x.id === filters.storagePath)
    chips.push({ label: `Path: ${sp?.name ?? filters.storagePath}`, onRemove: () => removeChip("storagePath") })
  }
  ;(filters.tags || []).forEach((id: number) => {
    const t = tags.find((x: any) => x.id === id)
    chips.push({ label: `Tag: ${t?.name ?? id}`, onRemove: () => removeChip("tags", id) })
  })
  ;(filters.tagsExclude || []).forEach((id: number) => {
    const t = tags.find((x: any) => x.id === id)
    chips.push({ label: `−Tag: ${t?.name ?? id}`, onRemove: () => removeChip("tagsExclude", id) })
  })
  if (filters.createdAfter) chips.push({ label: `Created after: ${filters.createdAfter}`, onRemove: () => removeChip("createdAfter") })
  if (filters.createdBefore) chips.push({ label: `Created before: ${filters.createdBefore}`, onRemove: () => removeChip("createdBefore") })
  if (filters.addedAfter) chips.push({ label: `Added after: ${filters.addedAfter}`, onRemove: () => removeChip("addedAfter") })
  if (filters.addedBefore) chips.push({ label: `Added before: ${filters.addedBefore}`, onRemove: () => removeChip("addedBefore") })
  if (filters.isInInbox) chips.push({ label: `Inbox only`, onRemove: () => removeChip("isInInbox") })
  if (filters.moreLikeId) chips.push({ label: `Similar to doc #${filters.moreLikeId}`, onRemove: () => removeChip("moreLikeId") })
  if (filters.owner === currentUserId && currentUserId != null) chips.push({ label: `Owner: Mine`, onRemove: () => removeChip("owner") })
  else if (filters.owner != null) chips.push({ label: `Owner: ${getUserLabel(filters.owner)}`, onRemove: () => removeChip("owner") })
  ;(filters.ownerAny || []).forEach((id) => {
    chips.push({ label: `Owner: ${getUserLabel(id)}`, onRemove: () => removeChip("ownerAny", id) })
  })
  if (filters.ownerExclude?.includes(currentUserId ?? -1)) {
    chips.push({ label: `Shared with me`, onRemove: () => removeChip("ownerExclude", currentUserId ?? undefined) })
  }
  if (filters.ownerIsNull === true) chips.push({ label: `Owner: None`, onRemove: () => removeChip("ownerIsNull") })
  if (filters.ownerIsNull === false && !filters.ownerExclude?.includes(currentUserId ?? -1)) {
    chips.push({ label: `Hide unowned`, onRemove: () => removeChip("ownerIsNull") })
  }
  if (filters.sharedByUser != null) chips.push({ label: `Shared by me`, onRemove: () => removeChip("sharedByUser") })

  const currentSort = SORT_OPTIONS.find((o) => o.value === (filters.ordering || "-created"))

  // Split saved views into sidebar views (show_in_sidebar) and the rest
  const allViews = savedViews

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="flex min-w-[10rem] flex-1 basis-[340px] items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
            <Input
              type="search"
              data-documents-hotkey="search-input"
              placeholder="Search documents…"
              className="pl-8 pr-20 h-8"
              value={searchValue}
              onChange={handleSearchChange}
              onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
              onKeyDown={(e) => { if (e.key === "Escape") setSuggestionsOpen(false) }}
              onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
              autoComplete="off"
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              className="absolute right-1 top-1 h-6 px-2 text-[11px] border-muted-foreground/20 hover:border-accent/50 hover:bg-accent/20"
            >
              Search
            </Button>
            {suggestionsOpen && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-md py-1">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent cursor-pointer flex items-center gap-2 "
                    onMouseDown={(e) => { e.preventDefault(); handleSuggestionSelect(s) }}
                  >
                    <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Correspondent picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={"h-8 min-h-8 hover:border-accent/50 hover:bg-accent/20" + (filters.correspondent ? " border-primary text-primary" : " border-muted-foreground/20")}>
              <User className="mr-2 h-4 w-4" />
              {filters.correspondent
                ? correspondents.find((c: any) => c.id === filters.correspondent)?.name ?? "Correspondent"
                : "Correspondent"}
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto w-[220px]">
            <DropdownMenuItem onClick={() => applyFilters({ ...filters, correspondent: undefined })}>
              <span className="text-muted-foreground">Any correspondent</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {correspondents.map((c: any) => (
              <DropdownMenuItem
                key={c.id}
                onClick={() => applyFilters({ ...filters, correspondent: c.id })}
                className={filters.correspondent === c.id ? "bg-accent" : ""}
              >
                {c.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Document type picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={"h-8 min-h-8 hover:border-accent/50 hover:bg-accent/20" + (filters.documentType ? " border-primary text-primary" : " border-muted-foreground/20")}>
              <FileType className="mr-2 h-4 w-4" />
              {filters.documentType
                ? documentTypes.find((t: any) => t.id === filters.documentType)?.name ?? "Type"
                : "Type"}
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto w-[200px]">
            <DropdownMenuItem onClick={() => applyFilters({ ...filters, documentType: undefined })}>
              <span className="text-muted-foreground">Any type</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {documentTypes.map((t: any) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => applyFilters({ ...filters, documentType: t.id })}
                className={filters.documentType === t.id ? "bg-accent" : ""}
              >
                {t.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tags multi-picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={"h-8 min-h-8 hover:border-accent/50 hover:bg-accent/20" + (((filters.tags?.length || 0) + (filters.tagsExclude?.length || 0)) > 0 ? " border-primary text-primary" : " border-muted-foreground/20")}
            >
              <Tag className="mr-2 h-4 w-4" />
              Tags
              {((filters.tags?.length || 0) + (filters.tagsExclude?.length || 0)) > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {(filters.tags?.length || 0) + (filters.tagsExclude?.length || 0)}
                </Badge>
              )}
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[240px]">
            <div className="flex gap-1 p-2">
              {(["all", "any", "not"] as TagFilterMode[]).map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={tagMode === m ? "default" : "outline"}
                  className="flex-1 h-7 text-xs"
                  onClick={() => setTagMode(m)}
                >
                  {m === "all" ? "All" : m === "any" ? "Any" : "Exclude"}
                </Button>
              ))}
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-[250px] overflow-y-auto">
              {tags.map((t: any) => (
                <DropdownMenuCheckboxItem
                  key={t.id}
                  checked={isTagSelected(t.id)}
                  onCheckedChange={() => toggleTag(t.id)}
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: tagColourHex(t.color) }}
                  />
                  {t.name}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dates */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              data-documents-hotkey="dates-trigger"
              title="Dates (Alt+F)"
              className={(filters.createdAfter || filters.createdBefore || filters.addedAfter || filters.addedBefore) ? "border-primary text-primary" : "h-8 min-h-8 border-muted-foreground/20 hover:border-accent/50 hover:bg-accent/20"}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Dates
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[320px] p-3 space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Created</div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={filters.createdAfter || ""}
                  onChange={(e) => applyFilters({ ...filters, createdAfter: e.target.value || undefined })}
                />
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={filters.createdBefore || ""}
                  onChange={(e) => applyFilters({ ...filters, createdBefore: e.target.value || undefined })}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={`created-${preset.id}`}
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={() => applyDatePreset("created", preset.id)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="text-xs font-medium text-muted-foreground">Added</div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={filters.addedAfter || ""}
                  onChange={(e) => applyFilters({ ...filters, addedAfter: e.target.value || undefined })}
                />
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={filters.addedBefore || ""}
                  onChange={(e) => applyFilters({ ...filters, addedBefore: e.target.value || undefined })}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={`added-${preset.id}`}
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={() => applyDatePreset("added", preset.id)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={filters.ordering ? "border-primary text-primary" : "h-8 min-h-8 border-muted-foreground/20 hover:border-accent/50 hover:bg-accent/20"}>
              <SortAsc className="mr-2 h-4 w-4" />
              {currentSort?.label ?? "Sort"}
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            {SORT_OPTIONS.map((o) => (
              <DropdownMenuItem
                key={o.value}
                onClick={() => applyFilters({ ...filters, ordering: o.value })}
                className={filters.ordering === o.value ? "bg-accent" : ""}
              >
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Permissions filter */}
        {currentUserId != null && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={(filters.owner != null || filters.ownerAny?.length || filters.ownerExclude?.length || filters.ownerIsNull != null || filters.sharedByUser != null) ? "border-primary text-primary" : ""}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Permissions
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[300px] p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={filters.owner == null && !filters.ownerAny?.length && !filters.ownerExclude?.length && filters.ownerIsNull == null && filters.sharedByUser == null ? "default" : "outline"}
                  onClick={() => applyPermissionPreset("all")}
                >
                  All
                </Button>
                <Button size="sm" variant={filters.owner === currentUserId ? "default" : "outline"} onClick={() => applyPermissionPreset("mine")}>
                  My documents
                </Button>
                <Button
                  size="sm"
                  variant={filters.ownerExclude?.includes(currentUserId) && filters.ownerIsNull === false ? "default" : "outline"}
                  onClick={() => applyPermissionPreset("shared-with-me")}
                >
                  Shared with me
                </Button>
                <Button size="sm" variant={filters.sharedByUser === currentUserId ? "default" : "outline"} onClick={() => applyPermissionPreset("shared-by-me")}>
                  Shared by me
                </Button>
                <Button size="sm" variant={filters.ownerIsNull === true ? "default" : "outline"} onClick={() => applyPermissionPreset("unowned")}>
                  Unowned
                </Button>
                <Button size="sm" variant="outline" onClick={clearPermissionFilters}>
                  Reset
                </Button>
              </div>

              <div className="space-y-2 border-t pt-3">
                <div className="text-xs font-medium text-muted-foreground">Specific owners</div>
                <div className="max-h-[180px] overflow-y-auto rounded-md border">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={filters.ownerAny?.includes(user.id) ?? false}
                        onChange={() => toggleOwnerAny(user.id)}
                      />
                      <span>{getUserLabel(user.id)}</span>
                    </label>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.ownerIsNull === false}
                    onChange={(e) => toggleHideUnowned(e.target.checked)}
                  />
                  <span>Hide unowned</span>
                </label>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {trailingControls}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              data-documents-hotkey="views-trigger"
              title="Views (Alt+V)"
              className={activeViewId ? "border-primary text-primary" : ""}
            >
              <LayoutList className="mr-2 h-4 w-4" />
              Views
              <ChevronDown className="ml-2 h-3 w-3" />
              {activeViewIsDirty && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[11px]">
                  Modified
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[240px]" forceMount>
            {allViews.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Saved views</DropdownMenuLabel>
                {allViews.map((v: any) => (
                  <DropdownMenuItem
                    key={v.id}
                    onClick={() => loadSavedView(v)}
                    className={activeViewId === v.id ? "bg-accent" : ""}
                  >
                    {activeViewId === v.id && <span className="mr-2 text-primary">✓</span>}
                    {v.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {(allViews.length > 0 || activeViewId) && <DropdownMenuSeparator />}
            {activeViewId && (
              <HasObjectPermission action="change" object={activeView} type="savedView">
                <DropdownMenuItem onClick={handleSaveView} disabled={saving || !activeViewIsDirty}>
                  <Save className="mr-2 h-4 w-4" />
                  Save view
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setEditorIsNew(false)
                    setEditorValue(buildEditorValueFromActiveView())
                    setEditorOpen(true)
                  }}
                  disabled={saving}
                >
                  Edit view…
                </DropdownMenuItem>
              </HasObjectPermission>
            )}
            <CanCreate type="savedView">
              <DropdownMenuItem
                onClick={() => {
                  setEditorIsNew(true)
                  setEditorValue(
                    buildEditorValueFromCurrentState(
                      activeViewName ? `${activeViewName} (copy)` : searchValue.trim() || "New saved view"
                    )
                  )
                  setEditorOpen(true)
                }}
              >
                <SaveAll className="mr-2 h-4 w-4" />
                {activeViewId ? "Save as new view…" : "Save view…"}
              </DropdownMenuItem>
            </CanCreate>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {filterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive hover:text-destructive">
              <X className="mr-1 h-4 w-4" />
              Clear ({filterCount})
            </Button>
          )}
        </div>
      </div>

      {/* ---- Active filter chips ---- */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip, i) => (
            <div
              key={i}
              className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="ml-1 rounded-full hover:bg-primary/20 p-0.5"
                aria-label="Remove filter"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <CanCreate type="savedView">
        <SavedViewEditor
          open={editorOpen}
          onOpenChange={(open) => {
            setEditorOpen(open)
            if (!open) {
              setEditorValue(null)
            }
          }}
          value={editorValue}
          onChange={setEditorValue}
          onSave={handleEditorSave}
          saving={saving}
          isNew={editorIsNew}
          lookups={savedViewLookups}
        />
      </CanCreate>
    </div>
  )
}
