import { describe, expect, it } from "vitest"
import { cn } from "@/lib/utils"

describe("cn", () => {
  it("merges simple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("handles conditional values", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra")
  })

  it("returns empty string when no classes are provided", () => {
    expect(cn()).toBe("")
  })

  it("deduplicates conflicting tailwind utilities", () => {
    expect(cn("p-4", "p-2")).toBe("p-2")
  })

  it("handles arrays of class names", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar")
  })

  it("filters out undefined and null values", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b")
  })
})
