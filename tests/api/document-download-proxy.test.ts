import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("@/auth", () => ({
  authOptions: {},
}))

import { getServerSession } from "next-auth"
import { GET } from "@/app/api/proxy/documents/[id]/download/route"

const mockedGetServerSession = vi.mocked(getServerSession)
type SessionWithAccessToken = { accessToken: string }

describe("document download proxy route", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.PAPERLESS_API_URL = "https://paperless.example/"
  })

  it("forwards auth and query params for binary downloads", async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: "abc123",
    } as SessionWithAccessToken)

    const fetchMock = vi.fn().mockResolvedValue(
      new Response("pdf", {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="doc.pdf"',
          "Content-Length": "3",
        },
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    const response = await GET(
      new Request(
        "http://localhost:3333/api/proxy/documents/4/download?version=7&original=true&follow_formatting=true"
      ),
      { params: Promise.resolve({ id: "4" }) }
    )

    expect(fetchMock).toHaveBeenCalledWith(
      "https://paperless.example/api/documents/4/download/?original=true&version=7&follow_formatting=true",
      {
        headers: {
          Authorization: "Token abc123",
        },
      }
    )
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("application/pdf")
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="doc.pdf"'
    )
    expect(response.headers.get("Content-Length")).toBe("3")
  })

  it("passes through backend error status and body", async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: "abc123",
    } as SessionWithAccessToken)

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Forbidden", {
          status: 403,
          headers: {
            "Content-Type": "text/plain",
          },
        })
      )
    )

    const response = await GET(
      new Request("http://localhost:3333/api/proxy/documents/4/download"),
      { params: Promise.resolve({ id: "4" }) }
    )

    expect(response.status).toBe(403)
    expect(await response.text()).toBe("Forbidden")
    expect(response.headers.get("Content-Type")).toBe("text/plain")
  })
})
