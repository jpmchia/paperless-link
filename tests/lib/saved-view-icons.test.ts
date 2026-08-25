import { describe, expect, it } from "vitest"
import {
  DEFAULT_SAVED_VIEW_ICON,
  SAVED_VIEW_ICONS,
  getSavedViewIcon,
  normalizeSavedViewIcon,
} from "@/data/saved-view-icons"

describe("saved view icons", () => {
  it("uses funnel as the default icon", () => {
    expect(DEFAULT_SAVED_VIEW_ICON).toBe("funnel")
    expect(normalizeSavedViewIcon(undefined)).toBe("funnel")
    expect(normalizeSavedViewIcon("unknown")).toBe("funnel")
  })

  it("exposes unique upstream icon ids and labels", () => {
    const ids = SAVED_VIEW_ICONS.map((item) => item.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining(["archive", "bank", "funnel", "receipt", "safe", "stars", "telephone"]))
    expect(SAVED_VIEW_ICONS.find((item) => item.id === "funnel")?.label).toBe("Filter")
  })

  it("maps allowed ids to Lucide components and falls back safely", () => {
    expect(getSavedViewIcon("archive")).toBe(SAVED_VIEW_ICONS.find((item) => item.id === "archive")?.icon)
    expect(getSavedViewIcon("not-allowed")).toBe(getSavedViewIcon("funnel"))
  })
})
