import { describe, expect, it } from "vitest"
import { FileVersion } from "@/data/share-link"
import {
  getShareLinkBundlePublicUrl,
  normalizeShareLinkBundlePayload,
  validateShareLinkBundlePayload,
} from "@/lib/share-link-bundles"

describe("share-link-bundles helpers", () => {
  it("rejects empty and invalid expiration payloads", () => {
    expect(
      validateShareLinkBundlePayload({
        document_ids: [],
        file_version: FileVersion.Archive,
        expiration_days: 7,
      })
    ).toMatch(/at least one document/i)

    expect(
      validateShareLinkBundlePayload({
        document_ids: [1],
        file_version: FileVersion.Archive,
        expiration_days: 0,
      })
    ).toMatch(/at least 1 day/i)
  })

  it("deduplicates document ids", () => {
    expect(
      normalizeShareLinkBundlePayload({
        document_ids: [3, 1, 3, 2],
        file_version: FileVersion.Original,
        expiration_days: null,
      }).document_ids
    ).toEqual([3, 1, 2])
  })

  it("builds public share URLs from the Paperless API base", () => {
    expect(
      getShareLinkBundlePublicUrl("abc", "https://paperless.example/api/")
    ).toBe("https://paperless.example/share/abc")
  })
})
