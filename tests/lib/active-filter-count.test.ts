import { describe, expect, it } from "vitest"
import { createStore } from "jotai"
import { filterParamsAtom, activeFilterCountAtom } from "@/lib/store"

describe("activeFilterCountAtom", () => {
  function countFilters(filters: Record<string, unknown>) {
    const store = createStore()
    store.set(filterParamsAtom, filters as never)
    return store.get(activeFilterCountAtom)
  }

  it("returns 0 for empty filters", () => {
    expect(countFilters({})).toBe(0)
  })

  it("counts query filter", () => {
    expect(countFilters({ query: "test" })).toBe(1)
  })

  it("counts single taxonomy filters", () => {
    expect(
      countFilters({
        correspondent: 1,
        documentType: 2,
        storagePath: 3,
      })
    ).toBe(3)
  })

  it("counts each tag individually", () => {
    expect(countFilters({ tags: [1, 2, 3] })).toBe(3)
  })

  it("counts each excluded tag individually", () => {
    expect(countFilters({ tagsExclude: [4, 5] })).toBe(2)
  })

  it("counts each 'any' tag individually", () => {
    expect(countFilters({ tagsAny: [6, 7, 8] })).toBe(3)
  })

  it("counts date range filters", () => {
    expect(
      countFilters({
        createdAfter: "2024-01-01",
        createdBefore: "2024-12-31",
        addedAfter: "2024-03-01",
        addedBefore: "2024-09-30",
      })
    ).toBe(4)
  })

  it("counts hasTag filter", () => {
    expect(countFilters({ hasTag: true })).toBe(1)
    expect(countFilters({ hasTag: false })).toBe(1)
  })

  it("counts ownership filters", () => {
    expect(
      countFilters({
        owner: 1,
        ownerAny: [2, 3],
        ownerExclude: [4],
        ownerIsNull: true,
        sharedByUser: 5,
      })
    ).toBe(6) // 1 + 2 + 1 + 1 + 1
  })

  it("does not count empty arrays", () => {
    expect(
      countFilters({
        tags: [],
        tagsAny: [],
        tagsExclude: [],
        ownerAny: [],
        ownerExclude: [],
      })
    ).toBe(0)
  })

  it("counts a comprehensive filter set correctly", () => {
    expect(
      countFilters({
        query: "invoice",
        correspondent: 1,
        documentType: 2,
        storagePath: 3,
        tags: [10, 20],
        tagsAny: [30],
        tagsExclude: [40, 50],
        createdAfter: "2024-01-01",
        createdBefore: "2024-12-31",
        addedAfter: "2024-06-01",
        addedBefore: "2024-09-30",
        hasTag: true,
        owner: 1,
        ownerAny: [2],
        ownerExclude: [3, 4],
        ownerIsNull: false,
        sharedByUser: 5,
      })
    ).toBe(
      1 + // query
        1 + // correspondent
        1 + // documentType
        1 + // storagePath
        2 + // tags
        1 + // tagsAny
        2 + // tagsExclude
        1 + // createdAfter
        1 + // createdBefore
        1 + // addedAfter
        1 + // addedBefore
        1 + // hasTag
        1 + // owner
        1 + // ownerAny
        2 + // ownerExclude
        1 + // ownerIsNull
        1 // sharedByUser
    )
  })
})
