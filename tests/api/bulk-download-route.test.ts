import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("@/auth", () => ({
  authOptions: {},
}))

import { getServerSession } from "next-auth"
import { POST } from "@/app/api/bulk-download/route"

const mockedGetServerSession = vi.mocked(getServerSession)

describe("bulk download route", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.PAPERLESS_API_URL = "https://paperless.example/"
    delete process.env.PAPERLESS_API_VERSION
  })

  it("forwards content and follow_formatting and preserves the upstream filename", async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: "user-token",
    } as { accessToken: string })

    const fetchMock = vi.fn().mockResolvedValue(
      new Response("zip", {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="custom-bulk.zip"',
        },
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(
      new Request("http://localhost/api/bulk-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: [5, 6],
          content: "archive",
          follow_formatting: true,
        }),
      })
    )

    expect(fetchMock).toHaveBeenCalledWith(
      "https://paperless.example/api/documents/bulk_download/",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Token user-token",
          Accept: "application/zip",
        }),
        body: JSON.stringify({
          documents: [5, 6],
          content: "archive",
          follow_formatting: true,
        }),
      })
    )
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="custom-bulk.zip"'
    )
  })

  it("resolves all-filtered selections with exclusions before downloading", async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: "user-token",
    } as { accessToken: string })

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            next: null,
            results: [{ id: 11 }, { id: 12 }, { id: 13 }],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response("zip", {
          status: 200,
          headers: { "Content-Type": "application/zip" },
        })
      )
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(
      new Request("http://localhost/api/bulk-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          all: true,
          filters: { query: "invoice" },
          excluded_document_ids: [12],
          content: "both",
          follow_formatting: false,
        }),
      })
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://paperless.example/api/documents/?query=invoice&page=1&page_size=500&fields=id",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Token user-token",
          Accept: "application/json; version=10",
        }),
      })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://paperless.example/api/documents/bulk_download/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          documents: [11, 13],
          content: "both",
          follow_formatting: false,
        }),
      })
    )
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="documents.zip"'
    )
  })

  it("rejects requests without a valid content selection", async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: "user-token",
    } as { accessToken: string })

    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(
      new Request("http://localhost/api/bulk-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: [5, 6],
          content: "",
          follow_formatting: false,
        }),
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Select at least one file type to download.",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
