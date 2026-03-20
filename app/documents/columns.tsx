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
  custom_fields?: { value: unknown; field: number }[]
  owner?: number | null
  notes?: { id: number; note?: string }[]
  num_notes?: number | null
  page_count?: number | null
  is_shared_by_requester?: boolean
}

export interface LookupMaps {
  correspondents: Record<number, { id: number; name: string }>
  documentTypes: Record<number, { id: number; name: string }>
  tags: Record<number, { id: number; name: string; color: string }>
  storagePaths: Record<number, { id: number; name: string }>
  users?: Record<number, { id: number; username?: string; first_name?: string; last_name?: string }>
  customFields: Record<number, {
    id: number
    name: string
    data_type: string
    extra_data?: {
      select_options?: Array<string | { id?: string | number; label?: string }>
    }
  }>
}

// These match NGX's DisplayField enum values
export const DISPLAY_FIELD_TITLE = "title"
export const DISPLAY_FIELD_CREATED = "created"
export const DISPLAY_FIELD_ADDED = "added"
export const DISPLAY_FIELD_MODIFIED = "modified"
export const DISPLAY_FIELD_TAGS = "tag"          // NGX uses "tag" (not "tags")
export const DISPLAY_FIELD_CORRESPONDENT = "correspondent"
export const DISPLAY_FIELD_DOCUMENT_TYPE = "documenttype"
export const DISPLAY_FIELD_STORAGE_PATH = "storagepath"
export const DISPLAY_FIELD_ASN = "asn"
export const DISPLAY_FIELD_OWNER = "owner"
export const DISPLAY_FIELD_NOTES = "note"
export const DISPLAY_FIELD_SHARED = "shared"
export const DISPLAY_FIELD_PAGE_COUNT = "pagecount"

// The default set matching NGX's DEFAULT_DISPLAY_FIELDS
export const DEFAULT_DISPLAY_FIELDS: string[] = [
  DISPLAY_FIELD_TITLE,
  DISPLAY_FIELD_CREATED,
  DISPLAY_FIELD_ADDED,
  DISPLAY_FIELD_TAGS,
  DISPLAY_FIELD_CORRESPONDENT,
  DISPLAY_FIELD_DOCUMENT_TYPE,
  DISPLAY_FIELD_STORAGE_PATH,
  DISPLAY_FIELD_NOTES,
  DISPLAY_FIELD_OWNER,
  DISPLAY_FIELD_SHARED,
  DISPLAY_FIELD_ASN,
  DISPLAY_FIELD_PAGE_COUNT,
]

// Custom field display field prefix (matches NGX's DisplayField.CUSTOM_FIELD)
export const CUSTOM_FIELD_PREFIX = "custom_field_"

export function getCustomFieldDisplayValue(
  fieldDef: LookupMaps["customFields"][number] | undefined,
  rawValue: unknown
): string | null {
  if (!fieldDef) return rawValue == null || rawValue === "" ? null : String(rawValue)
  if (rawValue === null || rawValue === undefined || rawValue === "") return null

  if (Array.isArray(rawValue)) {
    const values: string[] = rawValue
      .map((value) => getCustomFieldDisplayValue(fieldDef, value))
      .filter((value): value is string => Boolean(value))
    return values.length > 0 ? values.join(", ") : null
  }

  if (fieldDef.data_type === "boolean") {
    return rawValue === true ? "Yes" : rawValue === false ? "No" : String(rawValue)
  }

  if (fieldDef.data_type === "select") {
    const options = fieldDef.extra_data?.select_options ?? []
    const normalizedValue = String(rawValue)

    const objectOption = options.find((option) => {
      if (typeof option === "string") return false
      return String(option.id ?? "") === normalizedValue
    })
    if (objectOption && typeof objectOption !== "string") {
      return objectOption.label ?? normalizedValue
    }

    const numericIndex =
      typeof rawValue === "number" ? rawValue : Number.parseInt(normalizedValue, 10)
    if (!Number.isNaN(numericIndex) && numericIndex >= 0 && numericIndex < options.length) {
      const indexedOption = options[numericIndex]
      return typeof indexedOption === "string"
        ? indexedOption
        : indexedOption?.label ?? normalizedValue
    }

    return normalizedValue
  }

  return String(rawValue)
}

export function makeColumns(
  lookup: LookupMaps,
  displayFields: string[] = DEFAULT_DISPLAY_FIELDS
): ColumnDef<Document>[] {
  const show = (field: string) =>
    displayFields.length === 0 ||
    displayFields.includes(field) ||
    (
      (field === DISPLAY_FIELD_DOCUMENT_TYPE && displayFields.includes("document_type")) ||
      (field === DISPLAY_FIELD_STORAGE_PATH && displayFields.includes("storage_path")) ||
      (field === DISPLAY_FIELD_ASN && displayFields.includes("archive_serial_number")) ||
      (field === DISPLAY_FIELD_PAGE_COUNT && displayFields.includes("page_count"))
    )

  const getOwnerLabel = (ownerId: number | null) => {
    if (!ownerId) return null

    const user = lookup.users?.[ownerId]
    if (!user) return `#${ownerId}`

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim()
    return fullName || user.username || `#${ownerId}`
  }

  const getNotesCount = (row: Document) => {
    if (typeof row.num_notes === "number") return row.num_notes
    return row.notes?.length ?? 0
  }

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
        const path = lookup.storagePaths[id]
        return path ? (
          <span>{path.name}</span>
        ) : (
          <span className="text-muted-foreground">#{id}</span>
        )
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

  if (show(DISPLAY_FIELD_OWNER)) {
    cols.push({
      accessorKey: "owner",
      header: "Owner",
      cell: ({ row }) => {
        const ownerId = row.getValue("owner") as number | null
        if (!ownerId) return <span className="text-muted-foreground">-</span>

        return <span>{getOwnerLabel(ownerId)}</span>
      },
    })
  }

  if (show(DISPLAY_FIELD_NOTES)) {
    cols.push({
      id: "num_notes",
      header: "Notes",
      accessorFn: (row) => getNotesCount(row),
      cell: ({ row }) => {
        const count = getNotesCount(row.original)
        return <span className="text-sm">{count || 0}</span>
      },
    })
  }

  if (show(DISPLAY_FIELD_SHARED)) {
    cols.push({
      id: "shared",
      header: "Shared",
      accessorFn: (row) => row.is_shared_by_requester ?? false,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.is_shared_by_requester ? "Yes" : "No"}
        </span>
      ),
    })
  }

  if (show(DISPLAY_FIELD_PAGE_COUNT)) {
    cols.push({
      accessorKey: "page_count",
      header: "Pages",
      cell: ({ row }) => {
        const count = row.getValue("page_count") as number | null
        return <span className="text-sm">{count ?? 0}</span>
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
            (cf: { field: number; value: unknown }) => cf.field === fieldId
          )
          return entry?.value ?? null
        },
        header: fieldName,
        cell: ({ row }) => {
          const val =
            (row.original.custom_fields || []).find(
              (cf: { field: number; value: unknown }) => cf.field === fieldId
            )?.value ?? null
          if (val === null || val === undefined || val === "")
            return <span className="text-muted-foreground">-</span>
          if (typeof val === "boolean")
            return <span className="text-sm">{val ? "Yes" : "No"}</span>
          if (fieldDef?.data_type === "select") {
            const displayValue = getCustomFieldDisplayValue(fieldDef, val)
            return displayValue ? <span>{displayValue}</span> : <span className="text-muted-foreground">-</span>
          }
          if (val instanceof Date || (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}/)))
            return <span className="text-muted-foreground">{String(val).split("T")[0]}</span>
          return <span className="truncate block" title={String(val)}>{String(val)}</span>
        },
      })
    })

  if (displayFields.length > 0) {
    const aliases: Record<string, string[]> = {
      archive_serial_number: [DISPLAY_FIELD_ASN, "archive_serial_number"],
      document_type: [DISPLAY_FIELD_DOCUMENT_TYPE, "document_type"],
      num_notes: [DISPLAY_FIELD_NOTES, "notes", "note"],
      page_count: [DISPLAY_FIELD_PAGE_COUNT, "page_count"],
      storage_path: [DISPLAY_FIELD_STORAGE_PATH, "storage_path"],
      tags: [DISPLAY_FIELD_TAGS, "tags"],
      title: [DISPLAY_FIELD_TITLE],
      correspondent: [DISPLAY_FIELD_CORRESPONDENT],
      created: [DISPLAY_FIELD_CREATED],
      added: [DISPLAY_FIELD_ADDED],
      modified: [DISPLAY_FIELD_MODIFIED],
      owner: [DISPLAY_FIELD_OWNER],
      shared: [DISPLAY_FIELD_SHARED],
    }

    const getColumnOrder = (column: ColumnDef<Document>) => {
      const rawKey =
        ("id" in column && typeof column.id === "string" && column.id) ||
        ("accessorKey" in column && typeof column.accessorKey === "string" && column.accessorKey) ||
        ""

      const candidates = aliases[rawKey] ?? [rawKey]
      const order = candidates
        .map((candidate) => displayFields.indexOf(candidate))
        .filter((index) => index !== -1)
        .sort((a, b) => a - b)[0]

      return order ?? Number.MAX_SAFE_INTEGER
    }

    cols.sort((a, b) => getColumnOrder(a) - getColumnOrder(b))
  }

  return cols
}

// Backward-compatible default export (no lookup, default fields)
export const columns = makeColumns({ correspondents: {}, documentTypes: {}, tags: {}, storagePaths: {}, users: {}, customFields: {} })
