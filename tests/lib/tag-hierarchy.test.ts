import { describe, expect, it } from "vitest"
import {
  MAX_TAG_DEPTH,
  detectTagHierarchyCycles,
  flattenTagHierarchy,
  getTagAncestors,
  getTagDescendants,
  getTagPath,
  getValidTagParents,
} from "@/lib/tag-hierarchy"

const tags = [
  { id: 4, name: "Invoices", parent: 2 },
  { id: 1, name: "Personal" },
  { id: 3, name: "2026", parent: 4 },
  { id: 2, name: "Business" },
  { id: 5, name: "Receipts", parent: 2 },
]

describe("tag hierarchy", () => {
  it("flattens tags in deterministic alphabetical preorder", () => {
    expect(flattenTagHierarchy(tags).map(({ id, depth }) => [id, depth])).toEqual([
      [2, 0],
      [4, 1],
      [3, 2],
      [5, 1],
      [1, 0],
    ])
  })

  it("finds ancestors, descendants, and path labels", () => {
    expect(getTagAncestors(tags, 3).map((tag) => tag.id)).toEqual([2, 4])
    expect(getTagDescendants(tags, 2).map((tag) => tag.id)).toEqual([4, 3, 5])
    expect(getTagPath(tags, 3)).toBe("Business / Invoices / 2026")
  })

  it("detects every member of a cycle without looping", () => {
    const cyclic = [
      { id: 1, name: "One", parent: 2 },
      { id: 2, name: "Two", parent: 3 },
      { id: 3, name: "Three", parent: 1 },
    ]

    expect(detectTagHierarchyCycles(cyclic)).toEqual([1, 2, 3])
    expect(flattenTagHierarchy(cyclic)).toHaveLength(3)
  })

  it("excludes self, descendants, and parents that would exceed max depth", () => {
    const deepTags = Array.from({ length: MAX_TAG_DEPTH }, (_, index) => ({
      id: index + 10,
      name: `Level ${index + 1}`,
      parent: index === 0 ? undefined : index + 9,
    }))
    const allTags = [...tags, ...deepTags]

    const validIds = getValidTagParents(allTags, 4).map((tag) => tag.id)
    expect(validIds).not.toContain(4)
    expect(validIds).not.toContain(3)
    expect(validIds).not.toContain(14)
    expect(validIds).toContain(1)
  })
})
