import { describe, expect, it } from "vitest"
import { vi } from "vitest"
import {
  createAllFilteredDocumentSelection,
  createExplicitDocumentSelection,
  getDocumentSelectionCount,
  isDocumentSelected,
  serializeDocumentSelection,
  toggleDocumentSelection,
} from "@/lib/document-selection"

vi.mock("@/auth", () => ({
  authOptions: {},
}))

describe("document selection helpers", () => {
  it("serializes explicit selections as document ids", () => {
    const selection = createExplicitDocumentSelection([11, 12, 11])

    expect(serializeDocumentSelection(selection)).toEqual({
      documents: [11, 12],
    })
  })

  it("serializes all-filtered selections using normalized filters", () => {
    const selection = createAllFilteredDocumentSelection(
      {
        query: "invoice",
        tagsAny: [4, 9],
        ownerIsNull: false,
      },
      [42]
    )

    expect(selection).toMatchObject({
      type: "all-filtered",
      filters: {
        query: "invoice",
        tags__id__in: "4,9",
        owner__isnull: "false",
      },
      excludedDocumentIds: [42],
    })

    expect(serializeDocumentSelection(selection)).toEqual({
      all: true,
      filters: {
        query: "invoice",
        tags__id__in: "4,9",
        owner__isnull: "false",
      },
    })
  })

  it("counts and toggles exclusions for all-filtered selections", () => {
    const selection = createAllFilteredDocumentSelection({ query: "bank" })

    expect(getDocumentSelectionCount(selection, 5)).toBe(5)
    expect(isDocumentSelected(selection, 99)).toBe(true)

    const excludedSelection = toggleDocumentSelection(selection, 99)

    expect(excludedSelection).toMatchObject({
      type: "all-filtered",
      excludedDocumentIds: [99],
    })
    expect(getDocumentSelectionCount(excludedSelection, 5)).toBe(4)
    expect(isDocumentSelected(excludedSelection, 99)).toBe(false)
  })
})
