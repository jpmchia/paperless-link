import { describe, expect, it } from "vitest"
import {
  buildBulkDownloadPayload,
  deriveBulkDownloadContent,
  getBulkDownloadFilename,
} from "@/lib/bulk-download"
import {
  createAllFilteredDocumentSelection,
  createExplicitDocumentSelection,
} from "@/lib/document-selection"

describe("bulk download helpers", () => {
  it("derives all supported content values from checkbox state", () => {
    expect(
      deriveBulkDownloadContent({ archive: true, originals: true })
    ).toBe("both")
    expect(
      deriveBulkDownloadContent({ archive: true, originals: false })
    ).toBe("archive")
    expect(
      deriveBulkDownloadContent({ archive: false, originals: true })
    ).toBe("originals")
    expect(
      deriveBulkDownloadContent({ archive: false, originals: false })
    ).toBeNull()
  })

  it("builds payloads with follow_formatting and exclusions", () => {
    const selection = createAllFilteredDocumentSelection(
      { query: "invoice" },
      [42, 43]
    )

    expect(
      buildBulkDownloadPayload(selection, {
        archive: false,
        originals: true,
        followFormatting: true,
      })
    ).toEqual({
      all: true,
      filters: { query: "invoice" },
      excluded_document_ids: [42, 43],
      content: "originals",
      follow_formatting: true,
    })
  })

  it("throws when neither archive nor originals are selected", () => {
    const selection = createExplicitDocumentSelection([7, 8])

    expect(() =>
      buildBulkDownloadPayload(selection, {
        archive: false,
        originals: false,
        followFormatting: false,
      })
    ).toThrow("Select at least one file type to download.")
  })

  it("extracts filenames from content disposition headers", () => {
    expect(
      getBulkDownloadFilename('attachment; filename="named-documents.zip"')
    ).toBe("named-documents.zip")
    expect(
      getBulkDownloadFilename("attachment; filename*=UTF-8''receipts%20august.zip")
    ).toBe("receipts august.zip")
    expect(getBulkDownloadFilename(null)).toBe("documents.zip")
  })
})
