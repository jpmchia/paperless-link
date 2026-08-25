import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("@/auth", () => ({
  authOptions: {},
}))

import { getServerSession } from "next-auth"
import { POST } from "@/app/api/documents/selection-data/route"

const mockedGetServerSession = vi.mocked(getServerSession)

describe("documents selection-data route", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.PAPERLESS_API_URL = "https://paperless.example/"
    delete process.env.PAPERLESS_API_VERSION
  })

  it("returns 401 without a session token", async () => {
    mockedGetServerSession.mockResolvedValue(null)

    const response = await POST(
      new Request("http://localhost/api/documents/selection-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: [1, 2] }),
      })
    )

    expect(response.status).toBe(401)
  })

  it("posts explicit document ids to the NGX selection_data endpoint", async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: "user-token",
    } as { accessToken: string })

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          selected_tags: [{ id: 9, document_count: 2 }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    )
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(
      new Request("http://localhost/api/documents/selection-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: [5, 6] }),
      })
    )

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(
      "https://paperless.example/api/documents/selection_data/",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Token user-token",
          Accept: "application/json; version=10",
        }),
        body: JSON.stringify({ documents: [5, 6] }),
      })
    )
    await expect(response.json()).resolves.toEqual({
      selected_correspondents: [],
      selected_custom_fields: [],
      selected_document_types: [],
      selected_storage_paths: [],
      selected_tags: [{ id: 9, document_count: 2 }],
    })
  })

  it("resolves all-filtered selections with exclusions before requesting selection data", async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: "user-token",
    } as { accessToken: string })

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            next: "https://paperless.example/api/documents/?page=2",
            results: [{ id: 11 }, { id: 12 }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            next: null,
            results: [{ id: 13 }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            selected_correspondents: [{ id: 1, document_count: 2 }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(
      new Request("http://localhost/api/documents/selection-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          all: true,
          filters: { query: "invoice" },
          excluded_document_ids: [12],
        }),
      })
    )

    expect(response.status).toBe(200)
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
      3,
      "https://paperless.example/api/documents/selection_data/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ documents: [11, 13] }),
      })
    )
    await expect(response.json()).resolves.toEqual({
      selected_correspondents: [{ id: 1, document_count: 2 }],
      selected_custom_fields: [],
      selected_document_types: [],
      selected_storage_paths: [],
      selected_tags: [],
    })
  })
})
