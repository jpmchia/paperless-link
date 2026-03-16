import { describe, expect, it } from "vitest"
import {
  PaperlessClientError,
  toErrorMessage,
} from "@/lib/errors"

describe("toErrorMessage", () => {
  it("returns an Error message when available", () => {
    expect(toErrorMessage(new Error("boom"))).toBe("boom")
  })

  it("falls back when the input is unknown", () => {
    expect(toErrorMessage(undefined, "fallback")).toBe("fallback")
  })
})

describe("PaperlessClientError", () => {
  it("stores structured response details", () => {
    const error = new PaperlessClientError("Bad request", {
      body: { detail: "Broken" },
      status: 400,
      statusText: "Bad Request",
      url: "/api/proxy/example/",
    })

    expect(error.status).toBe(400)
    expect(error.url).toBe("/api/proxy/example/")
  })
})
