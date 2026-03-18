import { describe, expect, it } from "vitest"
import type { Document } from "@/app/documents/columns"
import {
  buildAvailableDetailFields,
  getDefaultDetailFieldLayout,
  getDetailCustomFieldId,
  normalizeDetailFieldLayout,
  resolveDetailFieldLayoutForDocumentType,
} from "@/app/documents/[id]/detail-field-layout"

describe("detail field layout", () => {
  it("builds standard and custom field options", () => {
    const fields = buildAvailableDetailFields([{ id: 7, name: "Cost centre" }])
    expect(fields.some((field) => field.id === "title")).toBe(true)
    expect(fields.some((field) => field.id === "cf_7" && field.label === "Cost centre")).toBe(true)
  })

  it("uses populated custom fields in the default layout", () => {
    const layout = getDefaultDetailFieldLayout(
      {
        id: 1,
        title: "Example",
        custom_fields: [
          { field: 4, value: "ABC" },
          { field: 5, value: "" },
        ],
      } as Document & { custom_fields: Array<{ field: number; value?: unknown }> },
      [{ id: 4 }, { id: 5 }]
    )

    expect(layout).toContain(getDetailCustomFieldId(4))
    expect(layout).not.toContain(getDetailCustomFieldId(5))
  })

  it("normalizes and resolves layouts by document type", () => {
    const fallback = ["title", "created"]
    const available = ["title", "created", "cf_3"]

    expect(normalizeDetailFieldLayout(["created", "missing"], available, fallback)).toEqual(["created"])
    expect(
      resolveDetailFieldLayoutForDocumentType(
        { "12": ["cf_3", "title"] },
        12,
        available,
        fallback
      )
    ).toEqual(["cf_3", "title"])
  })
})
