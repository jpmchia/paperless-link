import { describe, expect, it } from "vitest"
import {
  TAG_COLOUR_MAP,
  TAG_COLOUR_OPTIONS,
  tagColourHex,
  tagForeground,
  tagPillStyle,
} from "@/lib/tag-colors"

describe("TAG_COLOUR_MAP", () => {
  it("contains 12 entries mapping integer IDs to hex colours", () => {
    expect(Object.keys(TAG_COLOUR_MAP)).toHaveLength(12)
    for (const hex of Object.values(TAG_COLOUR_MAP)) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe("TAG_COLOUR_OPTIONS", () => {
  it("derives { id, hex } pairs from the colour map", () => {
    expect(TAG_COLOUR_OPTIONS).toHaveLength(12)
    expect(TAG_COLOUR_OPTIONS[0]).toEqual({ id: 1, hex: "#a6cee3" })
    for (const option of TAG_COLOUR_OPTIONS) {
      expect(option.id).toBeGreaterThanOrEqual(1)
      expect(option.hex).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe("tagColourHex", () => {
  it("returns fallback grey for null", () => {
    expect(tagColourHex(null)).toBe("#6b7280")
  })

  it("returns fallback grey for undefined", () => {
    expect(tagColourHex(undefined)).toBe("#6b7280")
  })

  it("returns a hex string directly when given a hex string", () => {
    expect(tagColourHex("#ff0000")).toBe("#ff0000")
  })

  it("returns the mapped hex for valid integer IDs (1–12)", () => {
    expect(tagColourHex(1)).toBe("#a6cee3")
    expect(tagColourHex(6)).toBe("#e31a1c")
    expect(tagColourHex(12)).toBe("#b15928")
  })

  it("returns fallback grey for an unknown integer ID", () => {
    expect(tagColourHex(99)).toBe("#6b7280")
  })

  it("returns fallback grey for zero (falsy number)", () => {
    expect(tagColourHex(0)).toBe("#6b7280")
  })
})

describe("tagForeground", () => {
  it("returns dark text for light backgrounds (high luminance)", () => {
    // #ffff99 is Light Yellow — very bright
    expect(tagForeground(11)).toBe("#1a1a1a")
  })

  it("returns white text for dark backgrounds (low luminance)", () => {
    // #6a3d9a is Purple — dark
    expect(tagForeground(10)).toBe("#ffffff")
    // #e31a1c is Red — also dark
    expect(tagForeground(6)).toBe("#ffffff")
  })

  it("returns white text when the hex is shorter than 6 characters", () => {
    expect(tagForeground("#abc")).toBe("#ffffff")
  })

  it("falls back gracefully for null/undefined", () => {
    // Fallback grey #6b7280 has moderate luminance
    const result = tagForeground(null)
    expect(["#1a1a1a", "#ffffff"]).toContain(result)
  })
})

describe("tagPillStyle", () => {
  it("returns an object with backgroundColor and color", () => {
    const style = tagPillStyle(1)
    expect(style).toEqual({
      backgroundColor: "#a6cee3",
      color: expect.stringMatching(/^#/),
    })
  })

  it("returns fallback style for null", () => {
    const style = tagPillStyle(null)
    expect(style.backgroundColor).toBe("#6b7280")
    expect(style.color).toMatch(/^#/)
  })

  it("uses hex string directly for v2 API colours", () => {
    const style = tagPillStyle("#1f78b4")
    expect(style.backgroundColor).toBe("#1f78b4")
  })
})
