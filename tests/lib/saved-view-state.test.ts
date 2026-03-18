import { describe, expect, it } from "vitest"
import {
  DEFAULT_SAVED_VIEW_ORDERING,
  filterParamsToSavedViewRules,
  getComparableSavedViewStateFromFilters,
  getComparableSavedViewStateFromView,
  isSavedViewDirty,
  orderingToSavedViewSort,
} from "@/app/documents/saved-view-state"

describe("saved view state helpers", () => {
  it("uses the document list default ordering when no explicit ordering is present", () => {
    expect(orderingToSavedViewSort(undefined)).toEqual({
      sortField: "created",
      sortReverse: true,
    })
    expect(DEFAULT_SAVED_VIEW_ORDERING).toBe("-created")
  })

  it("normalizes filter rules into a stable sorted order", () => {
    expect(
      filterParamsToSavedViewRules({
        tags: [5, 2],
        query: "invoice",
        createdAfter: "2025-01-01",
      })
    ).toEqual([
      { rule_type: 6, value: "2" },
      { rule_type: 6, value: "5" },
      { rule_type: 9, value: "2025-01-01" },
      { rule_type: 20, value: "invoice" },
    ])
  })

  it("treats equivalent saved-view state as clean even if the original rule order differs", () => {
    const view = {
      filter_rules: [
        { rule_type: 20, value: "invoice" },
        { rule_type: 6, value: "5" },
        { rule_type: 6, value: "2" },
      ],
      sort_field: "created",
      sort_reverse: true,
    }

    expect(
      isSavedViewDirty(
        {
          query: "invoice",
          tags: [2, 5],
          ordering: "-created",
        },
        getComparableSavedViewStateFromView(view)
      )
    ).toBe(false)
  })

  it("detects dirty state when filters diverge from the baseline view", () => {
    const baseline = getComparableSavedViewStateFromView({
      filter_rules: [{ rule_type: 20, value: "invoice" }],
      sort_field: "created",
      sort_reverse: true,
    })

    expect(
      isSavedViewDirty(
        {
          query: "receipt",
          ordering: "-created",
        },
        baseline
      )
    ).toBe(true)
  })

  it("builds comparable sort state from filter params", () => {
    expect(
      getComparableSavedViewStateFromFilters({
        ordering: "title",
      }, undefined, ["title", "created"], 50)
    ).toEqual({
      displayMode: "smallCards",
      displayFields: ["title", "created"],
      filterRules: [],
      pageSize: 50,
      sortField: "title",
      sortReverse: false,
    })
  })

  it("includes display mode in saved-view state comparisons", () => {
    const baseline = getComparableSavedViewStateFromView({
      filter_rules: [],
      sort_field: "created",
      sort_reverse: true,
      display_mode: "table",
      display_fields: ["title", "created"],
      page_size: 25,
    })

    expect(isSavedViewDirty({ ordering: "-created" }, baseline, "table", ["title", "created"], 25)).toBe(false)
    expect(isSavedViewDirty({ ordering: "-created" }, baseline, "smallCards", ["title", "created"], 25)).toBe(true)
  })

  it("includes display fields and page size in saved-view state comparisons", () => {
    const baseline = getComparableSavedViewStateFromView({
      filter_rules: [],
      sort_field: "created",
      sort_reverse: true,
      display_mode: "table",
      display_fields: ["title", "created"],
      page_size: 25,
    })

    expect(isSavedViewDirty({ ordering: "-created" }, baseline, "table", ["title", "created"], 25)).toBe(false)
    expect(isSavedViewDirty({ ordering: "-created" }, baseline, "table", ["title", "added"], 25)).toBe(true)
    expect(isSavedViewDirty({ ordering: "-created" }, baseline, "table", ["title", "created"], 50)).toBe(true)
  })

  it("serializes permission filters into saved-view rules", () => {
    expect(
      filterParamsToSavedViewRules({
        owner: 5,
        ownerAny: [7, 9],
        ownerExclude: [3],
        ownerIsNull: false,
        sharedByUser: 5,
      })
    ).toEqual([
      { rule_type: 32, value: "5" },
      { rule_type: 33, value: "7" },
      { rule_type: 33, value: "9" },
      { rule_type: 34, value: "false" },
      { rule_type: 35, value: "3" },
      { rule_type: 37, value: "5" },
    ])
  })
})
