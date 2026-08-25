import { describe, expect, it } from "vitest"
import { normalizeSearchHighlights } from "@/lib/search-highlights"

describe("normalizeSearchHighlights", () => {
  it("marks only span.match and b content", () => {
    expect(
      normalizeSearchHighlights(
        'Before <span class="match">needle</span> and <b>bold</b> after'
      )
    ).toEqual([
      {
        key: null,
        segments: [
          { matched: false, text: "Before " },
          { matched: true, text: "needle" },
          { matched: false, text: " and " },
          { matched: true, text: "bold" },
          { matched: false, text: " after" },
        ],
      },
    ])
  })

  it("normalizes keyed highlights and strips unsafe HTML", () => {
    expect(
      normalizeSearchHighlights({
        content: '<script>alert(1)</script>Safe <img src=x onerror=alert(2)> <span class="other">plain</span>',
        title: "<b>Invoice</b>",
      })
    ).toEqual([
      {
        key: "content",
        segments: [{ matched: false, text: "alert(1)Safe  plain" }],
      },
      {
        key: "title",
        segments: [{ matched: true, text: "Invoice" }],
      },
    ])
  })

  it("ignores unsupported values", () => {
    expect(normalizeSearchHighlights({ count: 3, empty: null })).toEqual([])
  })
})
