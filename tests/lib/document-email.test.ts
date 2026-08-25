import { describe, expect, it } from "vitest"
import {
  buildDocumentEmailPayload,
  parseDocumentEmailAddresses,
  validateDocumentEmailAddresses,
} from "@/lib/document-email"

describe("document email helpers", () => {
  it("splits, trims, and deduplicates addresses case-insensitively", () => {
    expect(
      parseDocumentEmailAddresses(
        " First@example.com,second@example.com\nfirst@example.com "
      )
    ).toEqual(["First@example.com", "second@example.com"])
  })

  it("reports invalid addresses", () => {
    expect(
      validateDocumentEmailAddresses("valid@example.com, invalid, @example.com")
    ).toEqual(["invalid", "@example.com"])
  })

  it("builds the backend payload with unique document ids", () => {
    expect(
      buildDocumentEmailPayload({
        documentIds: [4, 4, 7],
        addresses: "one@example.com; two@example.com",
        subject: " Subject ",
        message: " Message ",
        useArchiveVersion: false,
      })
    ).toEqual({
      documents: [4, 7],
      addresses: "one@example.com,two@example.com",
      subject: "Subject",
      message: "Message",
      use_archive_version: false,
    })
  })
})
