"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useAtom } from "jotai"
import { filterParamsAtom, activeFilterCountAtom } from "@/lib/store"
import type { FilterParams } from "@/lib/api"
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Filter, X, ChevronDown, Tag, User, FileType, FolderOpen, Calendar, SortAsc, LayoutList, Save, SaveAll, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { patchSavedView, createSavedView } from "./saved-view-actions"
import { tagColourHex, tagPillStyle } from "@/lib/tag-colors"

interface FilterPanelProps {
  correspondents: any[]
  documentTypes: any[]
  storagePaths: any[]
  tags: any[]
  savedViews: any[]
  totalCount: number
  activeViewId?: number | null
  activeViewName?: string | null
  initialFilters?: FilterParams
  onFilterChange?: (params: FilterParams) => void
  currentUserId?: number | null
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

// Convert FilterParams back into Paperless filter_rules[] for saving
function filterParamsToRules(f: FilterParams): any[] {
  const rules: any[] = []
  if (f.query) rules.push({ rule_type: 20, value: f.query })
  if (f.titleContains) rules.push({ rule_type: 0, value: f.titleContains })
  if (f.correspondent != null) rules.push({ rule_type: 3, value: String(f.correspondent) })
  if (f.documentType != null) rules.push({ rule_type: 4, value: String(f.documentType) })
  if (f.storagePath != null) rules.push({ rule_type: 25, value: String(f.storagePath) })
  ;(f.tags || []).forEach(id => rules.push({ rule_type: 6, value: String(id) }))
  ;(f.tagsAny || []).forEach(id => rules.push({ rule_type: 22, value: String(id) }))
  ;(f.tagsExclude || []).forEach(id => rules.push({ rule_type: 17, value: String(id) }))
  if (f.createdAfter) rules.push({ rule_type: 9, value: f.createdAfter })
  if (f.createdBefore) rules.push({ rule_type: 8, value: f.createdBefore })
  if (f.addedAfter) rules.push({ rule_type: 14, value: f.addedAfter })
  if (f.addedBefore) rules.push({ rule_type: 13, value: f.addedBefore })
  if (f.isInInbox) rules.push({ rule_type: 5, value: "true" })
  ;(f.correspondentAny || []).forEach(id => rules.push({ rule_type: 26, value: String(id) }))
  ;(f.correspondentNone || []).forEach(id => rules.push({ rule_type: 27, value: String(id) }))
  ;(f.documentTypeAny || []).forEach(id => rules.push({ rule_type: 28, value: String(id) }))
  ;(f.documentTypeNone || []).forEach(id => rules.push({ rule_type: 29, value: String(id) }))
  return rules
}

export function FilterPanel({
  correspondents,
  documentTypes,
  storagePaths,
  tags,
  savedViews,
  totalCount,
  activeViewId,
  activeViewName,
  initialFilters = {},
  onFilterChange,
  currentUserId,
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
  const [saveAsOpen, setSaveAsOpen] = React.useState(false)
  const [saveAsName, setSaveAsName] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Keep Jotai atom in sync for cross-component use (e.g. document detail Next/Prev)
  React.useEffect(() => {
    setAtomFilters(filters)
  }, [filters, setAtomFilters])

  // When searchValue changes externally (view switch) reset search bar
  React.useEffect(() => {
    setSearchValue(filters.query || "")
  }, [filters.query])

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
      if (updated.ordering) params.set("ordering", updated.ordering)
      const qs = params.toString()
      router.push(`${pathname}${qs ? `?${qs}` : ""}`)
    },
    [setLocalFilters, setAtomFilters, onFilterChange, router, pathname, activeViewId]
  )

  const loadSavedView = (view: any) => {
    router.push(`/documents?view=${view.id}`)
  }

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

  const clearAll = () => {
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
    if (!activeViewId) return
    setSaving(true)
    try {
      const sortParts = filters.ordering?.startsWith("-")
        ? { sort_reverse: true, sort_field: filters.ordering.slice(1) }
        : { sort_reverse: false, sort_field: filters.ordering || "created" }
      await patchSavedView(activeViewId, {
        filter_rules: filterParamsToRules(filters),
        ...sortParts,
      })
      toast.success(`View "${activeViewName}" saved`)
    } catch (e: any) {
      toast.error("Failed to save view", { description: e.message })
    } finally {
      setSaving(false)
    }
  }

  // Save as new view
  const handleSaveAs = async () => {
    if (!saveAsName.trim()) return
    setSaving(true)
    try {
      const sortParts = filters.ordering?.startsWith("-")
        ? { sort_reverse: true, sort_field: filters.ordering.slice(1) }
        : { sort_reverse: false, sort_field: filters.ordering || "created" }
      const created = await createSavedView({
        name: saveAsName.trim(),
        filter_rules: filterParamsToRules(filters),
        ...sortParts,
      })
      toast.success(`View "${saveAsName}" created`)
      setSaveAsOpen(false)
      setSaveAsName("")
      router.push(`/view/${created.id}`)
    } catch (e: any) {
      toast.error("Failed to create view", { description: e.message })
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
  else if (filters.owner != null) chips.push({ label: `Owner: #${filters.owner}`, onRemove: () => removeChip("owner") })
  if (filters.ownerIsNull) chips.push({ label: `Owner: None`, onRemove: () => removeChip("ownerIsNull") })
  if (filters.sharedByUser != null) chips.push({ label: `Shared with me`, onRemove: () => removeChip("sharedByUser") })

  const currentSort = SORT_OPTIONS.find((o) => o.value === (filters.ordering || "-created"))

  // Split saved views into sidebar views (show_in_sidebar) and the rest
  const sidebarViews = savedViews.filter((v: any) => v.show_in_sidebar)
  const allViews = savedViews

  return (
    <div className="flex flex-col gap-2">
      {/* ---- Active view indicator ---- */}
      {activeViewName && (
        <div className="flex items-center gap-2 text-sm">
          <LayoutList className="h-4 w-4 text-primary" />
          <span className="font-medium text-primary">{activeViewName}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={handleSaveView}
            disabled={saving}
          >
            <Save className="mr-1 h-3 w-3" />
            Save View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => { setSaveAsName(activeViewName + " (copy)"); setSaveAsOpen(true) }}
          >
            <SaveAll className="mr-1 h-3 w-3" />
            Save As…
          </Button>
        </div>
      )}

      {/* ---- Top row: search + filter controls ---- */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Full text search with autocomplete */}
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] max-w-sm flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
            <Input
              type="search"
              placeholder="Search documents…"
              className="pl-8"
              value={searchValue}
              onChange={handleSearchChange}
              onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
              onKeyDown={(e) => { if (e.key === "Escape") setSuggestionsOpen(false) }}
              onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
              autoComplete="off"
            />
            {suggestionsOpen && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-md py-1">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent cursor-pointer flex items-center gap-2"
                    onMouseDown={(e) => { e.preventDefault(); handleSuggestionSelect(s) }}
                  >
                    <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button type="submit" size="sm" variant="secondary">Search</Button>
        </form>

        {/* Saved Views */}
        {allViews.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <LayoutList className="mr-2 h-4 w-4" />
                Views
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[240px]">
              {sidebarViews.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Sidebar views</DropdownMenuLabel>
                  {sidebarViews.map((v: any) => (
                    <DropdownMenuItem
                      key={v.id}
                      onClick={() => loadSavedView(v)}
                      className={activeViewId === v.id ? "bg-accent" : ""}
                    >
                      {activeViewId === v.id && <span className="mr-2 text-primary">✓</span>}
                      {v.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuLabel className="text-xs text-muted-foreground">All views</DropdownMenuLabel>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSaveAsName(""); setSaveAsOpen(true) }}>
                <SaveAll className="mr-2 h-4 w-4" />
                Save current as new view…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Correspondent picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={filters.correspondent ? "border-primary text-primary" : ""}>
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
            <Button variant="outline" size="sm" className={filters.documentType ? "border-primary text-primary" : ""}>
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
              className={((filters.tags?.length || 0) + (filters.tagsExclude?.length || 0)) > 0 ? "border-primary text-primary" : ""}
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

        {/* Date range — Created */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={(filters.createdAfter || filters.createdBefore) ? "border-primary text-primary" : ""}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Created
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[220px] p-3 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">After</label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={filters.createdAfter || ""}
                onChange={(e) => applyFilters({ ...filters, createdAfter: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Before</label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={filters.createdBefore || ""}
                onChange={(e) => applyFilters({ ...filters, createdBefore: e.target.value || undefined })}
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
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

        {/* Owner filter */}
        {currentUserId != null && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={(filters.owner != null || filters.ownerIsNull || filters.sharedByUser != null) ? "border-primary text-primary" : ""}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Owner
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px]">
              <DropdownMenuItem onClick={() => applyFilters({ ...filters, owner: undefined, ownerIsNull: undefined, sharedByUser: undefined })}>
                <span className="text-muted-foreground">Any owner</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => applyFilters({ ...filters, owner: currentUserId, ownerIsNull: undefined, sharedByUser: undefined })}
                className={filters.owner === currentUserId ? "bg-accent" : ""}
              >
                Mine
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => applyFilters({ ...filters, owner: undefined, ownerIsNull: true, sharedByUser: undefined })}
                className={filters.ownerIsNull ? "bg-accent" : ""}
              >
                No owner
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => applyFilters({ ...filters, owner: undefined, ownerIsNull: undefined, sharedByUser: currentUserId })}
                className={filters.sharedByUser != null ? "bg-accent" : ""}
              >
                Shared with me
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Result count + Clear */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{totalCount.toLocaleString()} documents</span>
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

      {/* ---- Save As dialog ---- */}
      <Dialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save view as…</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="View name"
            value={saveAsName}
            onChange={(e) => setSaveAsName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveAs()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveAsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAs} disabled={saving || !saveAsName.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
