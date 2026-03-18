import { describe, expect, it } from "vitest"
import {
  buildUpdateDocumentPayload,
  normalizeCustomFieldValue,
} from "@/app/documents/[id]/details-payload"

describe("document details payload", () => {
  it("normalizes empty and unset custom field values explicitly", () => {
    expect(normalizeCustomFieldValue({ data_type: "string", id: 1 }, "")).toBeNull()
    expect(normalizeCustomFieldValue({ data_type: "select", id: 2 }, undefined)).toBeNull()
    expect(normalizeCustomFieldValue({ data_type: "documentlink", id: 3 }, "")).toBeNull()
    expect(normalizeCustomFieldValue({ data_type: "documentlink", id: 4 }, "1, 2, nope")).toEqual([1, 2])
    expect(normalizeCustomFieldValue({ data_type: "boolean", id: 5 }, undefined)).toBe(false)
  })

  it("maps select labels back to option ids", () => {
    expect(
      normalizeCustomFieldValue(
        {
          data_type: "select",
          extra_data: {
            select_options: [
              { id: "abc-123", label: "Option 1" },
              { id: "def-456", label: "Option 2" },
            ],
          },
          id: 6,
        },
        "Option 2"
      )
    ).toBe("def-456")
  })

  it("always includes a value key for visible custom fields", () => {
    const payload = buildUpdateDocumentPayload(
      {
        archive_serial_number: null,
        correspondent: "",
        created: "2026-03-18",
        document_type: null,
        storage_path: undefined,
        tags: [1, 2],
        title: "Invoice",
      },
      [
        { data_type: "string", id: 10 },
        { data_type: "documentlink", id: 11 },
        { data_type: "boolean", id: 12 },
      ],
      [10, 11, 12]
    ) as {
      archive_serial_number: null
      correspondent: null
      created: string
      custom_fields: Array<{ field: number; value: unknown }>
      document_type: null
      storage_path: null
      tags: number[]
      title: string
    }

    expect(payload.created).toBe("2026-03-18")
    expect(payload.correspondent).toBeNull()
    expect(payload.document_type).toBeNull()
    expect(payload.storage_path).toBeNull()
    expect(payload.custom_fields).toEqual([
      { field: 10, value: null },
      { field: 11, value: null },
      { field: 12, value: false },
    ])
  })
})
