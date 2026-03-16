import { describe, expect, it } from "vitest"
import {
  removeOpenDocument,
  upsertOpenDocument,
} from "@/lib/open-documents"

describe("open-documents", () => {
  it("moves an existing document to the front when reopened", () => {
    const next = upsertOpenDocument(
      [
        { href: "/documents/1", id: 1, lastOpenedAt: "2026-03-16T10:00:00.000Z", title: "One" },
        { href: "/documents/2", id: 2, lastOpenedAt: "2026-03-16T11:00:00.000Z", title: "Two" },
      ],
      { href: "/documents/1", id: 1, title: "One" }
    )

    expect(next.map((document) => document.id)).toEqual([1, 2])
  })

  it("removes documents by id", () => {
    const next = removeOpenDocument(
      [
        { href: "/documents/1", id: 1, lastOpenedAt: "2026-03-16T10:00:00.000Z", title: "One" },
        { href: "/documents/2", id: 2, lastOpenedAt: "2026-03-16T11:00:00.000Z", title: "Two" },
      ],
      1
    )

    expect(next).toEqual([
      { href: "/documents/2", id: 2, lastOpenedAt: "2026-03-16T11:00:00.000Z", title: "Two" },
    ])
  })
})
