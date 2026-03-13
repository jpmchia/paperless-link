import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { tagPillStyle } from "@/lib/tag-colors"

export type Document = {
  id: number
  title: string
  created: string
  added: string
  modified: string
  archive_serial_number: number | null | undefined
  correspondent: number | null | undefined
  document_type: number | null | undefined
  storage_path: number | null | undefined
  tags: number[]
  custom_fields?: { value: any; field: number }[]
  owner?: number | null
}

export interface LookupMaps {
  correspondents: Record<number, { id: number; name: string }>
  documentTypes: Record<number, { id: number; name: string }>
  tags: Record<number, { id: number; name: string; color: string }>
  customFields: Record<number, { id: number; name: string; data_type: string; extra_data?: { select_options?: string[] } }>
}

// These match NGX's DisplayField enum values
export const DISPLAY_FIELD_TITLE = "title"
export const DISPLAY_FIELD_CREATED = "created"
export const DISPLAY_FIELD_ADDED = "added"
export const DISPLAY_FIELD_MODIFIED = "modified"
export const DISPLAY_FIELD_TAGS = "tag"          // NGX uses "tag" (not "tags")
export const DISPLAY_FIELD_CORRESPONDENT = "correspondent"
export const DISPLAY_FIELD_DOCUMENT_TYPE = "document_type"
export const DISPLAY_FIELD_STORAGE_PATH = "storage_path"
export const DISPLAY_FIELD_ASN = "archive_serial_number"
export const DISPLAY_FIELD_OWNER = "owner"
export const DISPLAY_FIELD_NOTES = "note"

// The default set matching NGX's DEFAULT_DISPLAY_FIELDS
export const DEFAULT_DISPLAY_FIELDS: string[] = [
  DISPLAY_FIELD_TITLE,
  DISPLAY_FIELD_CREATED,
  DISPLAY_FIELD_CORRESPONDENT,
  DISPLAY_FIELD_DOCUMENT_TYPE,
  DISPLAY_FIELD_TAGS,
]

// Custom field display field prefix (matches NGX's DisplayField.CUSTOM_FIELD)
export const CUSTOM_FIELD_PREFIX = "custom_field_"

export function makeColumns(
  lookup: LookupMaps,
  displayFields: string[] = DEFAULT_DISPLAY_FIELDS
): ColumnDef<Document>[] {
  const show = (field: string) =>
    displayFields.length === 0 || displayFields.includes(field)

  const cols: ColumnDef<Document>[] = []

  // ASN — always shown if in displayFields
  if (show(DISPLAY_FIELD_ASN)) {
    cols.push({
      accessorKey: "archive_serial_number",
      header: "ASN",
      size: 70,
      cell: ({ row }) => {
        const asn = row.getValue("archive_serial_number") as number | null
        if (!asn) return <span className="text-muted-foreground">-</span>
        return <Badge variant="outline">#{asn}</Badge>
      },
    })
  }

  // Title — always first primary column
  if (show(DISPLAY_FIELD_TITLE)) {
    cols.push({
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium truncate" title={row.getValue("title")}>
          {row.getValue("title")}
        </div>
      ),
    })
  }

  // Correspondent
  if (show(DISPLAY_FIELD_CORRESPONDENT)) {
    cols.push({
      accessorKey: "correspondent",
      header: "Correspondent",
      cell: ({ row }) => {
        const id = row.getValue("correspondent") as number | null
        if (!id) return <span className="text-muted-foreground">-</span>
        const c = lookup.correspondents[id]
        return c ? (
          <span>{c.name}</span>
        ) : (
          <span className="text-muted-foreground">#{id}</span>
        )
      },
    })
  }

  // Document type
  if (show(DISPLAY_FIELD_DOCUMENT_TYPE)) {
    cols.push({
      accessorKey: "document_type",
      header: "Type",
      cell: ({ row }) => {
        const id = row.getValue("document_type") as number | null
        if (!id) return <span className="text-muted-foreground">-</span>
        const t = lookup.documentTypes[id]
        return t ? (
          <Badge variant="secondary" className="text-xs font-normal">
            {t.name}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">#{id}</span>
        )
      },
    })
  }

  // Storage path
  if (show(DISPLAY_FIELD_STORAGE_PATH)) {
    cols.push({
      accessorKey: "storage_path",
      header: "Storage Path",
      cell: ({ row }) => {
        const id = row.getValue("storage_path") as number | null
        if (!id) return <span className="text-muted-foreground">-</span>
        return <span className="text-muted-foreground">#{id}</span>
      },
    })
  }

  // Tags (NGX field name is "tag" singular)
  if (show(DISPLAY_FIELD_TAGS) || show("tags")) {
    cols.push({
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tagIds = (row.getValue("tags") as number[]) || []
        if (tagIds.length === 0)
          return <span className="text-muted-foreground text-xs">-</span>
        const visible = tagIds.slice(0, 4)
        const rest = tagIds.length - visible.length
        return (
          <div className="flex flex-wrap gap-1">
            {visible.map((tid) => {
              const tag = lookup.tags[tid]
              return tag ? (
                <span
                  key={tid}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  style={tagPillStyle(tag.color)}
                >
                  {tag.name}
                </span>
              ) : (
                <span key={tid} className="text-muted-foreground text-xs">
                  #{tid}
                </span>
              )
            })}
            {rest > 0 && (
              <span className="text-muted-foreground text-xs">+{rest}</span>
            )}
          </div>
        )
      },
    })
  }

  // Created date
  if (show(DISPLAY_FIELD_CREATED)) {
    cols.push({
      accessorKey: "created",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const d = (row.getValue("created") as string)?.split("T")[0] ?? ""
        return <div className="text-muted-foreground whitespace-nowrap text-sm">{d}</div>
      },
    })
  }

  // Added date
  if (show(DISPLAY_FIELD_ADDED)) {
    cols.push({
      accessorKey: "added",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Added
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const d = (row.getValue("added") as string)?.split("T")[0] ?? ""
        return <div className="text-muted-foreground whitespace-nowrap text-sm">{d}</div>
      },
    })
  }

  // Modified date
  if (show(DISPLAY_FIELD_MODIFIED)) {
    cols.push({
      accessorKey: "modified",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Modified
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const d = (row.getValue("modified") as string)?.split("T")[0] ?? ""
        return <div className="text-muted-foreground whitespace-nowrap text-sm">{d}</div>
      },
    })
  }

  // Custom field columns — any field matching 'custom_field_<id>'
  displayFields
    .filter((f) => f.startsWith(CUSTOM_FIELD_PREFIX))
    .forEach((f) => {
      const fieldId = parseInt(f.slice(CUSTOM_FIELD_PREFIX.length), 10)
      const fieldDef = lookup.customFields?.[fieldId]
      const fieldName = fieldDef?.name ?? `Custom Field ${fieldId}`

      cols.push({
        id: f,
        accessorFn: (row) => {
          const entry = (row.custom_fields || []).find(
            (cf: { field: number; value: any }) => cf.field === fieldId
          )
          return entry?.value ?? null
        },
        header: fieldName,
        cell: ({ getValue }) => {
          const val = getValue()
          if (val === null || val === undefined || val === "")
            return <span className="text-muted-foreground">-</span>
          if (typeof val === "boolean")
            return <span className="text-sm">{val ? "Yes" : "No"}</span>
          // Select fields: val is the option label string (Paperless stores the string directly)
          // or a numeric index into extra_data.select_options
          if (fieldDef?.data_type === "select") {
            const options = fieldDef.extra_data?.select_options ?? []
            const idx = typeof val === "number" ? val : parseInt(String(val), 10)
            if (!isNaN(idx) && options[idx] !== undefined) {
              return <span>{options[idx]}</span>
            }
            return <span>{String(val)}</span>
          }
          if (val instanceof Date || (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}/)))
            return <span className="text-muted-foreground">{String(val).split("T")[0]}</span>
          return <span className="truncate block" title={String(val)}>{String(val)}</span>
        },
      })
    })

  return cols
}

// Backward-compatible default export (no lookup, default fields)
export const columns = makeColumns({ correspondents: {}, documentTypes: {}, tags: {}, customFields: {} })
