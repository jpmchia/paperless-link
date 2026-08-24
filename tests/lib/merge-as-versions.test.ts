import { describe, expect, it } from "vitest"
import {
  buildMergeAsVersionsPayload,
  validateMergeAsVersionsPayload,
} from "@/lib/merge-as-versions"

describe("merge-as-versions helpers", () => {
  it("builds ordered payloads with optional single-source label", () => {
    expect(
      buildMergeAsVersionsPayload({
        rootDocumentId: 10,
        sourceDocumentIds: [20],
        versionLabel: " Imported ",
      })
    ).toEqual({
      documents: [10, 20],
      root_document_id: 10,
      version_label: "Imported",
    })
  })

  it("omits version_label when multiple sources are present", () => {
    expect(
      buildMergeAsVersionsPayload({
        rootDocumentId: 1,
        sourceDocumentIds: [2, 3],
        versionLabel: "Ignored",
      })
    ).toEqual({
      documents: [1, 2, 3],
      root_document_id: 1,
    })
  })

  it("validates root membership and minimum selection", () => {
    expect(
      validateMergeAsVersionsPayload({
        documents: [1],
        root_document_id: 1,
      })
    ).toMatch(/at least two/i)

    expect(
      validateMergeAsVersionsPayload({
        documents: [1, 2],
        root_document_id: 9,
      })
    ).toMatch(/root document/i)
  })
})
