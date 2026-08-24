import { describe, expect, it } from "vitest"
import {
  getPaperlessApiVersion,
  paperlessJsonAccept,
} from "@/lib/paperless-transport"

describe("paperless API version helpers", () => {
  it("defaults to version 10", () => {
    expect(getPaperlessApiVersion({})).toBe(10)
    expect(paperlessJsonAccept(10)).toBe("application/json; version=10")
  })

  it("accepts an explicit version 9 override", () => {
    expect(getPaperlessApiVersion({ PAPERLESS_API_VERSION: "9" })).toBe(9)
    expect(paperlessJsonAccept(9)).toBe("application/json; version=9")
  })

  it("rejects invalid versions", () => {
    expect(() =>
      getPaperlessApiVersion({ PAPERLESS_API_VERSION: "2" })
    ).toThrow(/Invalid PAPERLESS_API_VERSION/)
  })
})
