import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import type { ColumnDef } from "@tanstack/react-table"
import {
  CUSTOM_FIELD_PREFIX,
  DEFAULT_DISPLAY_FIELDS,
  DISPLAY_FIELD_ADDED,
  DISPLAY_FIELD_ASN,
  DISPLAY_FIELD_CORRESPONDENT,
  DISPLAY_FIELD_CREATED,
  DISPLAY_FIELD_DOCUMENT_TYPE,
  DISPLAY_FIELD_NOTES,
  DISPLAY_FIELD_OWNER,
  DISPLAY_FIELD_PAGE_COUNT,
  DISPLAY_FIELD_SHARED,
  DISPLAY_FIELD_STORAGE_PATH,
  DISPLAY_FIELD_TAGS,
  DISPLAY_FIELD_TITLE,
  makeColumns,
  type Document,
} from "@/app/documents/columns"

function getColumnKey(column: ColumnDef<Document>) {
  if ("id" in column && column.id) return column.id
  if ("accessorKey" in column && typeof column.accessorKey === "string") {
    return column.accessorKey
  }

  return undefined
}

describe("document list columns", () => {
  it("includes the full NGX standard display field set by default", () => {
    expect(DEFAULT_DISPLAY_FIELDS).toEqual([
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
    ])
  })

  it("renders the missing standard fields with readable values", () => {
    const row: Document = {
      added: "2026-03-17T09:00:00Z",
      archive_serial_number: 42,
      correspondent: 7,
      created: "2026-03-16T09:00:00Z",
      custom_fields: [],
      document_type: 8,
      id: 1,
      is_shared_by_requester: true,
      modified: "2026-03-17T10:00:00Z",
      num_notes: 3,
      owner: 5,
      page_count: 12,
      storage_path: 9,
      tags: [],
      title: "Invoice",
    }

    const columns = makeColumns(
      {
        correspondents: { 7: { id: 7, name: "Acme Corp" } },
        customFields: {},
        documentTypes: { 8: { id: 8, name: "Invoice" } },
        storagePaths: { 9: { id: 9, name: "Cabinet A" } },
        tags: {},
        users: { 5: { first_name: "Alice", id: 5, last_name: "Smith", username: "asmith" } },
      },
      DEFAULT_DISPLAY_FIELDS
    )

    const byId = new Map(
      columns
        .map((column) => [getColumnKey(column), column] as const)
        .filter((entry): entry is [string, ColumnDef<Document>] => Boolean(entry[0]))
    )

    expect(renderToStaticMarkup((byId.get("owner")!.cell as any)({
      row: {
        getValue: (key: string) => row[key as keyof Document],
        original: row,
      },
    }))).toContain("Alice Smith")

    expect(renderToStaticMarkup((byId.get("num_notes")!.cell as any)({
      row: { original: row },
    }))).toContain("3")

    expect(renderToStaticMarkup((byId.get("shared")!.cell as any)({
      row: { original: row },
    }))).toContain("Yes")

    expect(renderToStaticMarkup((byId.get("page_count")!.cell as any)({
      row: {
        getValue: (key: string) => row[key as keyof Document],
      },
    }))).toContain("12")

    expect(renderToStaticMarkup((byId.get("storage_path")!.cell as any)({
      row: {
        getValue: (key: string) => row[key as keyof Document],
      },
    }))).toContain("Cabinet A")
  })

  it("orders custom fields according to the active display-fields list", () => {
    const customFieldId = 12
    const columns = makeColumns(
      {
        correspondents: {},
        customFields: {
          [customFieldId]: { data_type: "string", id: customFieldId, name: "Project Code" },
        },
        documentTypes: {},
        storagePaths: {},
        tags: {},
        users: {},
      },
      [DISPLAY_FIELD_TITLE, `${CUSTOM_FIELD_PREFIX}${customFieldId}`, DISPLAY_FIELD_CREATED]
    )

    expect(columns.map((column) => getColumnKey(column))).toEqual([
      "title",
      `${CUSTOM_FIELD_PREFIX}${customFieldId}`,
      "created",
    ])
  })
})
