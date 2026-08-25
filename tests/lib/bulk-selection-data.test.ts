import { describe, expect, it } from "vitest"
import {
  buildToggleMap,
  computeItemsDelta,
  getSingleValueFieldState,
  getUnanimousSingleValueId,
  itemState,
  normalizeSelectionData,
} from "@/lib/bulk-selection-data"

describe("bulk selection data helpers", () => {
  it("normalizes missing selection data fields to empty arrays", () => {
    expect(normalizeSelectionData(null)).toEqual({
      selected_correspondents: [],
      selected_custom_fields: [],
      selected_document_types: [],
      selected_storage_paths: [],
      selected_tags: [],
    })
  })

  it("derives tri-state values from document counts", () => {
    expect(itemState({ id: 1, document_count: 3 }, 3)).toBe("selected")
    expect(itemState({ id: 2, document_count: 1 }, 3)).toBe("partial")
    expect(itemState({ id: 3, document_count: 0 }, 3)).toBe("unselected")
  })

  it("builds a toggle map for all, partial, and empty items", () => {
    expect(
      buildToggleMap(
        [
          { id: 1, document_count: 3 },
          { id: 2, document_count: 1 },
          { id: 3, document_count: 0 },
        ],
        3
      )
    ).toEqual({
      1: "selected",
      2: "partial",
      3: "unselected",
    })
  })

  it("computes add/remove deltas between ID selections", () => {
    expect(computeItemsDelta([1, 2, 4], [2, 3, 4])).toEqual({
      itemsToAdd: [3],
      itemsToRemove: [1],
    })
  })

  it("detects unanimous and partial single-value selections", () => {
    const selectedItems = [
      { id: 10, document_count: 3 },
      { id: 11, document_count: 0 },
    ]
    const partialItems = [
      { id: 10, document_count: 2 },
      { id: 11, document_count: 1 },
    ]

    expect(getUnanimousSingleValueId(selectedItems, 3)).toBe(10)
    expect(getUnanimousSingleValueId(partialItems, 3)).toBeNull()

    expect(getSingleValueFieldState(selectedItems, 3)).toEqual({
      state: "selected",
      value: 10,
    })
    expect(getSingleValueFieldState(partialItems, 3)).toEqual({
      state: "partial",
      value: null,
    })
    expect(getSingleValueFieldState([], 3)).toEqual({
      state: "unselected",
      value: null,
    })
  })
})
