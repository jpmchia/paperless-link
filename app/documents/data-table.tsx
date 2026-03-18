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
} from "./columns"

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
  ChevronLeft,
  ChevronRight,
  ScanEye,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { BulkActionBar } from "./bulk-action-bar"
import { DocumentPreviewDialog } from "./document-preview-dialog"
import { Slider } from "@/components/ui/slider"
import type { DocumentDisplayMode } from "./display-mode"

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
  displayFields?: string[]
  currentFilters?: FilterParams
  onFilterChange?: (params: FilterParams) => void
  usersList?: any[]
  groupsList?: any[]
  onDisplayFieldsChange?: React.Dispatch<React.SetStateAction<string[]>>
}

const PAGE_SIZES = [10, 25, 50, 100]

interface DataTableHeaderBarProps {
  currentPage: number
  pageCount: number
  totalCount: number
  displayMode?: DocumentDisplayMode
  cardSize?: number
  onCardSizeChange?: (value: number) => void
}

export function DataTableHeaderBar({
  currentPage,
  pageCount,
  totalCount,
  displayMode = "table",
  cardSize = 220,
  onCardSizeChange,
}: DataTableHeaderBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pageSize = Number(searchParams.get("page_size") || "25")
  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalCount)
  const isCardMode = displayMode !== "table"

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

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground">
        <span className="whitespace-nowrap">{totalCount.toLocaleString()} documents</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {isCardMode && onCardSizeChange ? (
          <div className="flex min-w-[180px] items-center gap-2">
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">
              Card size
            </span>
            <Slider
              value={[cardSize]}
              min={displayMode === "largeCards" ? 240 : 150}
              max={displayMode === "largeCards" ? 420 : 280}
              step={10}
              className="w-28"
              aria-label="Card size"
              onValueChange={(values) => {
                const nextValue = values[0]
                if (typeof nextValue === "number") {
                  onCardSizeChange(nextValue)
                }
              }}
            />
          </div>
        ) : null}

        <span className="whitespace-nowrap">
          {totalCount > 0 ? `${start}–${end} of ${totalCount.toLocaleString()}` : "0 results"}
        </span>

        <Select
          value={String(pageSize)}
          onValueChange={(value) => router.push(buildPageSizeUrl(Number(value)))}
        >
          <SelectTrigger className="h-7 w-[72px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
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
  )
}

export function DataTable({
  lookup,
  data,
  pageCount,
  displayFields: initialDisplayFields,
  currentFilters = {},
  onFilterChange,
  usersList = [],
  groupsList = [],
  onDisplayFieldsChange,
}: DataTableProps) {
  const router = useRouter()
  const navigateToDocument = useOpenDocumentNavigation()
  const setDocList = useSetAtom(documentListState)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [saving, setSaving] = React.useState(false)
  const [previewDocId, setPreviewDocId] = React.useState<number | null>(null)
  const [previewDocTitle, setPreviewDocTitle] = React.useState<string | undefined>()
  const [columnResizeMode] = React.useState<ColumnResizeMode>("onChange")

  // Local display fields state — initialized from prop (view's settings) or default
  const [localDisplayFields, setLocalDisplayFields] = React.useState<string[]>(
    initialDisplayFields && initialDisplayFields.length > 0
      ? initialDisplayFields
      : DEFAULT_DISPLAY_FIELDS
  )
  const displayFields = onDisplayFieldsChange ? (initialDisplayFields ?? DEFAULT_DISPLAY_FIELDS) : localDisplayFields
  const setDisplayFields = onDisplayFieldsChange ?? setLocalDisplayFields

  // Re-sync when prop changes (e.g. navigating between views)
  React.useEffect(() => {
    if (!onDisplayFieldsChange) {
      if (initialDisplayFields && initialDisplayFields.length > 0) {
        setLocalDisplayFields(initialDisplayFields)
      } else {
        setLocalDisplayFields(DEFAULT_DISPLAY_FIELDS)
      }
    }
  }, [initialDisplayFields?.join(","), onDisplayFieldsChange]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep document ID list in Jotai for Next/Prev navigation in detail view
  React.useEffect(() => {
    setDocList(data.map((d: any) => d.id))
  }, [data, setDocList])

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

  const selectedIds = Object.keys(rowSelection).map(Number)

  const handleBulkComplete = () => {
    setRowSelection({})
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
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
      <div className="relative flex-1 overflow-auto rounded-md border [&>[data-slot=table-container]]:overflow-visible">
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
                    className="sticky top-0 z-20 overflow-hidden border-b bg-muted text-xs whitespace-nowrap backdrop-blur supports-[backdrop-filter]:bg-muted/50 group/th"
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
