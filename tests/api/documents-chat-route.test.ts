import { beforeEach, describe, expect, it, vi } from "vitest"

const resolvePaperlessAccessTokenMock = vi.fn()
const getPaperlessBaseUrlMock = vi.fn()

vi.mock("@/lib/paperless-transport", () => ({
  getPaperlessBaseUrl: (...args: unknown[]) => getPaperlessBaseUrlMock(...args),
  paperlessJsonAccept: vi.fn(() => "application/json; version=10"),
  resolvePaperlessAccessToken: (...args: unknown[]) =>
    resolvePaperlessAccessTokenMock(...args),
}))

import { POST } from "@/app/api/documents/chat/route"

describe("documents chat route", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getPaperlessBaseUrlMock.mockReturnValue("https://paperless.example/")
  })

  it("returns 401 when no Paperless token is available", async () => {
    resolvePaperlessAccessTokenMock.mockResolvedValue(null)

    const response = await POST(
      new Request("http://localhost/api/documents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: 12, q: "Summarize this" }),
      })
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("streams raw upstream text without SSE frame coercion", async () => {
    resolvePaperlessAccessTokenMock.mockResolvedValue("user-token")

    const fetchMock = vi.fn().mockResolvedValue(
      new Response("partial answer", {
        status: 200,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(
      new Request("http://localhost/api/documents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: 12, q: "Summarize this" }),
      })
    )

    expect(fetchMock).toHaveBeenCalledWith(
      "https://paperless.example/api/documents/chat/",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Token user-token",
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        }),
        body: JSON.stringify({ document_id: 12, q: "Summarize this" }),
      })
    )
    expect(response.headers.get("Content-Type")).toBe(
      "text/event-stream; charset=utf-8"
    )
    await expect(response.text()).resolves.toBe("partial answer")
  })
})
