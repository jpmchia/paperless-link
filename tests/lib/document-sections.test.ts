import { describe, expect, it } from "vitest"
import {
  DEFAULT_DOCUMENT_SECTION,
  getDocumentSectionHref,
  getDocumentSections,
  resolveDocumentSection,
} from "@/app/documents/[id]/document-sections"

describe("document sections", () => {
  it("filters permissions and share sections by capability", () => {
    expect(
      getDocumentSections({
        canChangeDocument: false,
        canManageShareLinks: false,
      })
    ).not.toContain("permissions")

    expect(
      getDocumentSections({
        canChangeDocument: false,
        canManageShareLinks: false,
      })
    ).not.toContain("share")
  })

  it("resolves invalid or unavailable sections to the first allowed section", () => {
    const sections = getDocumentSections({
      canChangeDocument: false,
      canManageShareLinks: false,
    })

    expect(resolveDocumentSection("permissions", sections)).toBe(DEFAULT_DOCUMENT_SECTION)
    expect(resolveDocumentSection("not-a-tab", sections)).toBe(DEFAULT_DOCUMENT_SECTION)
  })

  it("builds canonical hrefs for the details tab and named tabs", () => {
    expect(getDocumentSectionHref(12, "details")).toBe("/documents/12")
    expect(getDocumentSectionHref(12, "versions")).toBe("/documents/12/versions")
  })
})
