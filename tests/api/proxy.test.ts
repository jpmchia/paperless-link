import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("@/auth", () => ({
  authOptions: {},
}))

import { getServerSession } from "next-auth"
import { GET, POST } from "@/app/api/proxy/[...path]/route"

const mockedGetServerSession = vi.mocked(getServerSession)

describe("catch-all paperless proxy", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.PAPERLESS_API_URL = "https://paperless.example/"
    delete process.env.PAPERLESS_API_TOKEN
    delete process.env.PAPERLESS_API_VERSION
  })

  it("forwards session token with API v10 Accept by default", async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: "user-token",
    } as { accessToken: string })

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    const response = await GET(
      new Request("http://localhost/api/proxy/documents/?page=1"),
      { params: Promise.resolve({ path: ["documents"] }) }
    )

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(
      "https://paperless.example/api/documents/?page=1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Token user-token",
          Accept: "application/json; version=10",
        }),
      })
    )
  })

  it("streams non-JSON responses without coercing to JSON", async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: "user-token",
    } as { accessToken: string })

    const fetchMock = vi.fn().mockResolvedValue(
      new Response("chunk", {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(
      new Request("http://localhost/api/proxy/documents/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: "hello", document_id: 1 }),
      }),
      { params: Promise.resolve({ path: ["documents", "chat"] }) }
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("text/event-stream")
    await expect(response.text()).resolves.toBe("chunk")
  })
})
