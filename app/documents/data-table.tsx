"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  ColumnResizeMode,
  RowSelectionState,
  useReactTable,
  ColumnDef,
} from "@tanstack/react-table"
import { useRouter, useSearchParams } from "next/navigation"
import { useSetAtom } from "jotai"
import { useOpenDocumentNavigation } from "@/hooks/use-open-document-navigation"
import { documentListState } from "@/lib/store"
import type { FilterParams } from "@/lib/api"
import {
  makeColumns,
  LookupMaps,
  DEFAULT_DISPLAY_FIELDS,
  DISPLAY_FIELD_TITLE,
  DISPLAY_FIELD_CREATED,
  DISPLAY_FIELD_ADDED,
  DISPLAY_FIELD_MODIFIED,
  DISPLAY_FIELD_TAGS,
  DISPLAY_FIELD_CORRESPONDENT,
  DISPLAY_FIELD_DOCUMENT_TYPE,
  DISPLAY_FIELD_STORAGE_PATH,
  DISPLAY_FIELD_ASN,
  DISPLAY_FIELD_NOTES,
  DISPLAY_FIELD_OWNER,
  DISPLAY_FIELD_SHARED,
  DISPLAY_FIELD_PAGE_COUNT,
  CUSTOM_FIELD_PREFIX,
} from "./columns"
import { patchSavedView } from "./saved-view-actions"
import { toast } from "sonner"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Columns, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Eye, EyeOff, ScanEye } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { BulkActionBar } from "./bulk-action-bar"
import { DocumentPreviewDialog } from "./document-preview-dialog"

// All available display fields users can toggle
const ALL_FIELDS: { id: string; label: string }[] = [
  { id: DISPLAY_FIELD_TITLE,         label: "Title" },
  { id: DISPLAY_FIELD_CREATED,       label: "Created" },
  { id: DISPLAY_FIELD_ADDED,         label: "Added" },
  { id: DISPLAY_FIELD_MODIFIED,      label: "Modified" },
  { id: DISPLAY_FIELD_CORRESPONDENT, label: "Correspondent" },
  { id: DISPLAY_FIELD_DOCUMENT_TYPE, label: "Document Type" },
  { id: DISPLAY_FIELD_STORAGE_PATH,  label: "Storage Path" },
  { id: DISPLAY_FIELD_TAGS,          label: "Tags" },
  { id: DISPLAY_FIELD_NOTES,         label: "Notes" },
  { id: DISPLAY_FIELD_OWNER,         label: "Owner" },
  { id: DISPLAY_FIELD_SHARED,        label: "Shared" },
  { id: DISPLAY_FIELD_ASN,           label: "ASN" },
  { id: DISPLAY_FIELD_PAGE_COUNT,    label: "Pages" },
]

interface DataTableProps {
  lookup: LookupMaps
  data: any[]
  pageCount: number
  currentPage: number
  totalCount: number
  displayFields?: string[]
  activeViewId?: number | null
  currentFilters?: FilterParams
  onFilterChange?: (params: FilterParams) => void
  usersList?: any[]
  groupsList?: any[]
}

const PAGE_SIZES = [10, 25, 50, 100]

export function DataTable({
  lookup,
  data,
  pageCount,
  currentPage,
  totalCount,
  displayFields: initialDisplayFields,
  activeViewId,
  currentFilters = {},
  onFilterChange,
  usersList = [],
  groupsList = [],
}: DataTableProps) {
  const router = useRouter()
  const navigateToDocument = useOpenDocumentNavigation()
  const searchParams = useSearchParams()
  const setDocList = useSetAtom(documentListState)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [saving, setSaving] = React.useState(false)
  const [previewDocId, setPreviewDocId] = React.useState<number | null>(null)
  const [previewDocTitle, setPreviewDocTitle] = React.useState<string | undefined>()
  const [columnResizeMode] = React.useState<ColumnResizeMode>("onChange")
  const pageSize = Number(searchParams.get("page_size") || "25")

  // Local display fields state — initialized from prop (view's settings) or default
  const [displayFields, setDisplayFields] = React.useState<string[]>(
    initialDisplayFields && initialDisplayFields.length > 0
      ? initialDisplayFields
      : DEFAULT_DISPLAY_FIELDS
  )

  // Re-sync when prop changes (e.g. navigating between views)
  React.useEffect(() => {
    if (initialDisplayFields && initialDisplayFields.length > 0) {
      setDisplayFields(initialDisplayFields)
    } else {
      setDisplayFields(DEFAULT_DISPLAY_FIELDS)
    }
  }, [initialDisplayFields?.join(",")]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep document ID list in Jotai for Next/Prev navigation in detail view
  React.useEffect(() => {
    setDocList(data.map((d: any) => d.id))
  }, [data, setDocList])

  // Build all known custom field entries
  const customFieldEntries = Object.values(lookup.customFields ?? {}) as any[]

  // Combine all available fields for the picker (standard + custom)
  const allAvailableFields: { id: string; label: string }[] = [
    ...ALL_FIELDS,
    ...customFieldEntries.map((cf) => ({
      id: `${CUSTOM_FIELD_PREFIX}${cf.id}`,
      label: cf.name,
    })),
  ]

  const columns = React.useMemo(() => {
    const selectColumn: ColumnDef<any>[] = [{
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableResizing: false,
      size: 36,
      minSize: 36,
      maxSize: 36,
    }]
    const previewColumn: ColumnDef<any> = {
      id: "preview",
      enableSorting: false,
      enableResizing: false,
      size: 40,
      minSize: 40,
      maxSize: 40,
      cell: ({ row }) => (
        <button
          type="button"
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover/row:opacity-100 transition-opacity"
          title="Quick preview"
          onClick={(e) => {
            e.stopPropagation()
            setPreviewDocId(row.original.id)
            setPreviewDocTitle(row.original.title)
          }}
        >
          <ScanEye className="h-3.5 w-3.5" />
        </button>
      ),
    }
    return [...selectColumn, ...makeColumns(lookup, displayFields), previewColumn] as any[]
  }, [lookup, displayFields])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: { sorting, rowSelection },
    manualPagination: true,
    pageCount,
    columnResizeMode,
    enableColumnResizing: true,
    enableRowSelection: true,
    getRowId: (row) => String(row.id),
    defaultColumn: {
      minSize: 60,
      size: 150,
      maxSize: 600,
    },
  })

  // --- Display field ordering helpers ---

  const moveField = (id: string, dir: "up" | "down") => {
    setDisplayFields((prev) => {
      const idx = prev.indexOf(id)
      if (idx === -1) return prev
      const next = [...prev]
      const swap = dir === "up" ? idx - 1 : idx + 1
      if (swap < 0 || swap >= next.length) return prev
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
  }

  const toggleField = (fieldId: string) => {
    setDisplayFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((f) => f !== fieldId)
        : [...prev, fieldId]
    )
  }

  const saveColumns = async () => {
    if (!activeViewId) return
    setSaving(true)
    try {
      await patchSavedView(activeViewId, { display_fields: displayFields })
      toast.success("Column layout saved to view")
    } catch (e: any) {
      toast.error("Failed to save columns", { description: e.message })
    } finally {
      setSaving(false)
    }
  }

  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    return `?${params.toString()}`
  }

  const buildPageSizeUrl = (size: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page_size", String(size))
    params.delete("page")
    return `?${params.toString()}`
  }

  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalCount)

  const selectedIds = Object.keys(rowSelection).map(Number)

  const handleBulkComplete = () => {
    setRowSelection({})
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0">
        {/* Column picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns className="mr-2 h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[260px] max-h-[440px] overflow-y-auto"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {/* Active columns — ordered, with Up/Down reorder + hide button */}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Active columns (drag order with ↑↓)
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {displayFields.map((fId, idx) => {
              const meta = allAvailableFields.find((f) => f.id === fId)
              if (!meta) return null
              return (
                <div
                  key={fId}
                  className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent rounded-sm"
                >
                  <span className="flex-1 truncate">{meta.label}</span>
                  <button
                    type="button"
                    className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                    disabled={idx === 0}
                    onClick={() => moveField(fId, "up")}
                    title="Move up"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                    disabled={idx === displayFields.length - 1}
                    onClick={() => moveField(fId, "down")}
                    title="Move down"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                    onClick={() => toggleField(fId)}
                    title="Hide column"
                  >
                    <EyeOff className="h-3 w-3" />
                  </button>
                </div>
              )
            })}

            {/* Hidden columns — show + button to add them */}
            {(() => {
              const hidden = allAvailableFields.filter(
                (f) => !displayFields.includes(f.id)
              )
              if (hidden.length === 0) return null
              return (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Hidden columns
                  </DropdownMenuLabel>
                  {hidden.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground rounded-sm"
                    >
                      <span className="flex-1 truncate">{f.label}</span>
                      <button
                        type="button"
                        className="p-0.5 rounded hover:bg-muted"
                        onClick={() => toggleField(f.id)}
                        title="Show column"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </>
              )
            })()}

            {/* Save to view button */}
            {activeViewId && (
              <>
                <DropdownMenuSeparator />
                <div className="p-1">
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={saveColumns}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save to view"}
                  </Button>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Pagination */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="whitespace-nowrap">
            {totalCount > 0 ? `${start}–${end} of ${totalCount.toLocaleString()}` : "0 results"}
          </span>

          <Select
            value={String(pageSize)}
            onValueChange={(v) => router.push(buildPageSizeUrl(Number(v)))}
          >
            <SelectTrigger className="h-7 w-[72px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage <= 1}
              asChild
            >
              <Link href={buildPageUrl(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <span className="min-w-[60px] text-center text-xs">
              {currentPage} / {pageCount || 1}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= (pageCount || 1)}
              asChild
            >
              <Link href={buildPageUrl(currentPage + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <BulkActionBar
          selectedIds={selectedIds}
          onClearSelection={() => setRowSelection({})}
          onComplete={handleBulkComplete}
          tags={Object.values(lookup.tags ?? {}).map((t: any) => ({ id: t.id, name: t.name, color: t.color }))}
          correspondents={Object.values(lookup.correspondents ?? {}).map((c: any) => ({ id: c.id, name: c.name }))}
          documentTypes={Object.values(lookup.documentTypes ?? {}).map((dt: any) => ({ id: dt.id, name: dt.name }))}
          storagePaths={Object.values(lookup.storagePaths ?? {}).map((sp: any) => ({ id: sp.id, name: sp.name }))}
          customFields={Object.values(lookup.customFields ?? {}).map((cf: any) => ({ id: cf.id, name: cf.name, data_type: cf.data_type }))}
          usersList={usersList}
          groupsList={groupsList}
        />
      )}
      {/* Table */}
      <div className="rounded-md border overflow-auto flex-1">
        <Table
          className="text-xs"
          style={{ tableLayout: "fixed", width: table.getTotalSize() }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="relative overflow-hidden group/th whitespace-nowrap text-xs"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}

                    {/* Resize handle */}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none opacity-0 group-hover/th:opacity-100 bg-border hover:bg-primary transition-opacity"
                      />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50 group/row"
                  onClick={() =>
                    navigateToDocument({
                      documentId: row.original.id,
                      title: row.original.title || `Document ${row.original.id}`,
                    })
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="py-1.5 text-xs overflow-hidden"
                      style={{ maxWidth: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground text-xs">
                  No documents match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DocumentPreviewDialog
        documentId={previewDocId}
        documentTitle={previewDocTitle}
        onClose={() => setPreviewDocId(null)}
      />
    </div>
  )
}
