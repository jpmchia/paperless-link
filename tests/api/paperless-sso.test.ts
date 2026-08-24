// @vitest-environment node

import type { NextApiRequest, NextApiResponse } from "next"
import { beforeEach, describe, expect, it, vi } from "vitest"

import callbackHandler from "@/pages/api/auth/paperless-sso/callback"
import startHandler from "@/pages/api/auth/paperless-sso/start"
import {
  serializePaperlessSsoSessionCookie,
  serializePaperlessSsoStateCookie,
} from "@/lib/paperless-sso"

type MockResponse = NextApiResponse & {
  body?: unknown
  headers: Record<string, string | string[]>
  redirectedTo?: string
  statusCode: number
}

function createMockResponse(): MockResponse {
  const headers: Record<string, string | string[]> = {}

  const res = {
    body: undefined as unknown,
    headers,
    redirectedTo: undefined as string | undefined,
    statusCode: 200,
    getHeader(name: string) {
      return headers[name]
    },
    end(body?: unknown) {
      this.body = body
      return this
    },
    json(body: unknown) {
      this.body = body
      return this
    },
    redirect(statusOrUrl: number | string, url?: string) {
      if (typeof statusOrUrl === "string") {
        this.statusCode = 307
        this.redirectedTo = statusOrUrl
      } else {
        this.statusCode = statusOrUrl
        this.redirectedTo = url
      }
      return this
    },
    setHeader(name: string, value: string | string[]) {
      headers[name] = value
      return this
    },
    status(code: number) {
      this.statusCode = code
      return this
    },
  }

  return res as unknown as MockResponse
}

function createMockRequest(
  request: Partial<NextApiRequest> & {
    body?: NextApiRequest["body"]
    cookies?: Record<string, string>
    headers?: Record<string, string | string[] | undefined>
    method?: string
    query?: Record<string, string | string[] | undefined>
  }
): NextApiRequest {
  return {
    body: {},
    cookies: {},
    headers: {},
    method: "GET",
    query: {},
    ...request,
  } as NextApiRequest
}

describe("paperless SSO API handlers", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal("fetch", vi.fn())
    process.env.NEXTAUTH_SECRET = "test-secret"
    process.env.NEXTAUTH_URL = "https://link.example.com"
    process.env.PAPERLESS_PUBLIC_URL = "https://link.example.com/paperless/"
    process.env.PAPERLESS_INTERNAL_URL = "http://paperless:8000/"
  })

  it("rejects unsafe callback URLs before starting the SSO flow", async () => {
    const req = createMockRequest({
      method: "POST",
      body: {
        callbackUrl: "https://evil.example.com/steal",
        provider: "openid",
      },
      headers: {
        host: "link.example.com",
        "x-forwarded-proto": "https",
      },
    })
    const res = createMockResponse()

    await startHandler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({
      error: "Invalid callback URL.",
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("creates a Link session from a successful Paperless callback", async () => {
    const stateCookie = await serializePaperlessSsoStateCookie(
      {
        callbackUrl: "/documents?view=recent",
        nonce: "nonce-123",
        provider: "openid",
        state: "state-123",
      },
      { secure: true }
    )
    const sessionCookie = await serializePaperlessSsoSessionCookie(
      "pending-headless-session-token",
      { secure: true }
    )

    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            user: {
              display: "Alice Example",
              email: "alice@example.com",
              id: 42,
              username: "alice",
            },
          },
          meta: {
            access_token: "paperless-drf-token",
            is_authenticated: true,
            session_token: "pending-headless-session-token",
          },
          status: 200,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    )

    const req = createMockRequest({
      method: "GET",
      cookies: {
        "paperless-link.sso.session": sessionCookie.split(";")[0].split("=")[1] ?? "",
        "paperless-link.sso.state": stateCookie.split(";")[0].split("=")[1] ?? "",
      },
      headers: {
        host: "link.example.com",
        "x-forwarded-proto": "https",
      },
      query: {
        link_state: "state-123",
      },
    })
    const res = createMockResponse()

    await callbackHandler(req, res)

    expect(fetch).toHaveBeenCalledWith(
      "http://paperless:8000/api/auth/headless/app/v1/auth/session",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          "X-Session-Token": "pending-headless-session-token",
        }),
        method: "GET",
      })
    )
    expect(res.redirectedTo).toBe("/documents?view=recent")
    expect(res.statusCode).toBe(302)
    expect(res.headers["Set-Cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("next-auth.session-token="),
      ])
    )
  })

  it("keeps the pending session when Paperless requires provider signup", async () => {
    const stateCookie = await serializePaperlessSsoStateCookie(
      {
        callbackUrl: "/dashboard",
        nonce: "nonce-456",
        provider: "openid",
        state: "state-456",
      },
      { secure: true }
    )
    const sessionCookie = await serializePaperlessSsoSessionCookie(
      "pending-headless-session-token",
      { secure: true }
    )

    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            flows: [{ id: "provider_signup", is_pending: true }],
          },
          meta: {
            is_authenticated: false,
            session_token: "pending-headless-session-token",
          },
          status: 401,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      )
    )

    const req = createMockRequest({
      method: "GET",
      cookies: {
        "paperless-link.sso.session": sessionCookie.split(";")[0].split("=")[1] ?? "",
        "paperless-link.sso.state": stateCookie.split(";")[0].split("=")[1] ?? "",
      },
      headers: {
        host: "link.example.com",
        "x-forwarded-proto": "https",
      },
      query: {
        link_state: "state-456",
      },
    })
    const res = createMockResponse()

    await callbackHandler(req, res)

    expect(res.redirectedTo).toBe(
      "/login?callbackUrl=%2Fdashboard&error=paperless-sso-provider-signup"
    )
    expect(res.headers["Set-Cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("paperless-link.sso.session="),
      ])
    )
  })
})
