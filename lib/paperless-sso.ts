import { createHmac, randomBytes } from "node:crypto"

import type { NextApiRequest } from "next"

import { serializeCookie } from "@/lib/server-cookie"

type PaperlessSsoConfigResponse = {
  data?: {
    socialaccount?: {
      providers?: Array<{
        flows?: string[]
        id?: string
        name?: string
      }>
    }
  }
  errors?: Array<{
    code?: string
    message?: string
    param?: string
  }>
  meta?: {
    access_token?: string
    is_authenticated?: boolean
    session_token?: string
  }
  status?: number
}

type PaperlessSessionUser = {
  display?: string
  email?: string
  id?: number | string
  username?: string
}

export type PaperlessSessionResponse = {
  data?: {
    flows?: Array<{
      id?: string
      is_pending?: boolean
      types?: string[]
    }>
    user?: PaperlessSessionUser
  }
  errors?: Array<{
    code?: string
    message?: string
    param?: string
  }>
  meta?: {
    access_token?: string
    is_authenticated?: boolean
    session_token?: string
  }
  status?: number
}

export type PaperlessSsoProvider = {
  id: string
  name: string
}

export type PaperlessSsoStatePayload = {
  callbackUrl: string
  nonce: string
  provider: string
  state: string
}

export type PaperlessSsoPendingState =
  | "provider-signup"
  | "verify-email"
  | "mfa"
  | "error"
  | null

const PAPERLESS_SSO_MAX_AGE_SECONDS = 15 * 60
const PAPERLESS_SSO_SESSION_COOKIE = "paperless-link.sso.session"
const PAPERLESS_SSO_STATE_COOKIE = "paperless-link.sso.state"
function getNextAuthSecret() {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for Paperless SSO.")
  }
  return secret
}

function resolveCookieSecurity() {
  const nextAuthUrl = process.env.NEXTAUTH_URL
  if (!nextAuthUrl) {
    return false
  }

  try {
    return new URL(nextAuthUrl).protocol === "https:"
  } catch {
    return false
  }
}

function serializePaperlessCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number
    secure?: boolean
  } = {}
) {
  return serializeCookie(name, value, {
    httpOnly: true,
    maxAge: options.maxAge ?? PAPERLESS_SSO_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: options.secure ?? resolveCookieSecurity(),
  })
}

function signPaperlessCookieValue(scope: string, payload: string) {
  return createHmac("sha256", `${getNextAuthSecret()}:${scope}`)
    .update(payload)
    .digest("base64url")
}

function encodePaperlessCookieValue(scope: string, token: Record<string, string>) {
  const payload = Buffer.from(JSON.stringify(token), "utf8").toString("base64url")
  const signature = signPaperlessCookieValue(scope, payload)
  return `${payload}.${signature}`
}

function decodePaperlessCookieValue(scope: string, value: string | undefined) {
  if (!value) {
    return null
  }

  const [payload, signature] = value.split(".")
  if (!payload || !signature) {
    return null
  }

  if (signPaperlessCookieValue(scope, payload) !== signature) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<
      string,
      string
    >
  } catch {
    return null
  }
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value : `${value}/`
}

function getPaperlessServerBaseUrl() {
  return normalizeBaseUrl(
    process.env.PAPERLESS_INTERNAL_URL ||
      process.env.PAPERLESS_API_URL ||
      process.env.PAPERLESS_PUBLIC_URL ||
      "http://localhost:8000/"
  )
}

export function getPaperlessPublicBaseUrl() {
  return normalizeBaseUrl(
    process.env.PAPERLESS_PUBLIC_URL ||
      process.env.PAPERLESS_API_URL ||
      getPaperlessServerBaseUrl()
  )
}

function getPaperlessHeadlessUrl(path: string) {
  return new URL(
    `api/auth/headless/app/v1/${path.replace(/^\/+/, "")}`,
    getPaperlessServerBaseUrl()
  ).toString()
}

export function getRequestOrigin(req: NextApiRequest) {
  const forwardedProto = req.headers["x-forwarded-proto"]
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto || "http"
  const host = req.headers.host

  if (!host) {
    throw new Error("Unable to determine request host.")
  }

  return `${proto}://${host}`
}

export function normalizeCallbackUrl(
  value: string | string[] | undefined,
  origin?: string
) {
  const candidate = Array.isArray(value) ? value[0] : value
  if (!candidate) {
    return "/dashboard"
  }

  if (candidate.startsWith("/")) {
    return candidate.startsWith("//") ? null : candidate
  }

  if (!origin) {
    return null
  }

  try {
    const parsed = new URL(candidate)
    const allowedOrigin = new URL(origin)
    if (parsed.origin !== allowedOrigin.origin) {
      return null
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}

export async function serializePaperlessSsoStateCookie(
  payload: PaperlessSsoStatePayload,
  options: {
    secure?: boolean
  } = {}
) {
  const value = encodePaperlessCookieValue(PAPERLESS_SSO_STATE_COOKIE, {
    callbackUrl: payload.callbackUrl,
    nonce: payload.nonce,
    provider: payload.provider,
    state: payload.state,
  })

  return serializePaperlessCookie(PAPERLESS_SSO_STATE_COOKIE, value, options)
}

export async function serializePaperlessSsoSessionCookie(
  sessionToken: string,
  options: {
    secure?: boolean
  } = {}
) {
  const value = encodePaperlessCookieValue(PAPERLESS_SSO_SESSION_COOKIE, {
    sessionToken,
  })

  return serializePaperlessCookie(PAPERLESS_SSO_SESSION_COOKIE, value, options)
}

export function clearPaperlessSsoCookies(options: { secure?: boolean } = {}) {
  return [
    serializePaperlessCookie(PAPERLESS_SSO_STATE_COOKIE, "", {
      ...options,
      maxAge: 0,
    }),
    serializePaperlessCookie(PAPERLESS_SSO_SESSION_COOKIE, "", {
      ...options,
      maxAge: 0,
    }),
  ]
}

export async function readPaperlessSsoStateCookie(req: NextApiRequest) {
  const decoded = decodePaperlessCookieValue(
    PAPERLESS_SSO_STATE_COOKIE,
    req.cookies[PAPERLESS_SSO_STATE_COOKIE]
  )

  if (
    !decoded ||
    typeof decoded.callbackUrl !== "string" ||
    typeof decoded.nonce !== "string" ||
    typeof decoded.provider !== "string" ||
    typeof decoded.state !== "string"
  ) {
    return null
  }

  return {
    callbackUrl: decoded.callbackUrl,
    nonce: decoded.nonce,
    provider: decoded.provider,
    state: decoded.state,
  } satisfies PaperlessSsoStatePayload
}

export async function readPaperlessSsoSessionCookie(req: NextApiRequest) {
  const decoded = decodePaperlessCookieValue(
    PAPERLESS_SSO_SESSION_COOKIE,
    req.cookies[PAPERLESS_SSO_SESSION_COOKIE]
  )

  return typeof decoded?.sessionToken === "string" ? decoded.sessionToken : null
}

export async function fetchPaperlessSsoConfig() {
  const response = await fetch(getPaperlessHeadlessUrl("/config"), {
    headers: {
      Accept: "application/json",
    },
    method: "GET",
  })

  const data = (await response.json()) as PaperlessSsoConfigResponse
  return {
    ok: response.ok,
    ...data,
  }
}

export function extractPaperlessSsoProviders(
  config: PaperlessSsoConfigResponse | null | undefined
) {
  return (
    config?.data?.socialaccount?.providers
      ?.filter((provider) => provider.id && provider.name)
      .map((provider) => ({
        id: provider.id as string,
        name: provider.name as string,
      })) ?? []
  )
}

export async function fetchPaperlessHeadlessSession(sessionToken: string) {
  const response = await fetch(getPaperlessHeadlessUrl("/auth/session"), {
    headers: {
      Accept: "application/json",
      "X-Session-Token": sessionToken,
    },
    method: "GET",
  })

  const data = (await response.json()) as PaperlessSessionResponse
  return {
    ok: response.ok,
    ...data,
  }
}

export async function postPaperlessHeadlessProviderRedirect(options: {
  callbackUrl: string
  provider: string
}) {
  const response = await fetch(getPaperlessHeadlessUrl("/auth/provider/redirect"), {
    body: JSON.stringify({
      callback_url: options.callbackUrl,
      process: "login",
      provider: options.provider,
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  const data = (await response.json()) as PaperlessSessionResponse & {
    data?: {
      redirect_url?: string
    }
  }

  return {
    ok: response.ok,
    ...data,
  }
}

export async function postPaperlessHeadlessProviderSignup(options: {
  email: string
  sessionToken: string
}) {
  const response = await fetch(getPaperlessHeadlessUrl("/auth/provider/signup"), {
    body: JSON.stringify({
      email: options.email,
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Session-Token": options.sessionToken,
    },
    method: "POST",
  })

  const data = (await response.json()) as PaperlessSessionResponse
  return {
    ok: response.ok,
    ...data,
  }
}

export async function postPaperlessHeadlessProviderToken(options: {
  clientId?: string
  idToken?: string
  provider: string
  token?: string
}) {
  const response = await fetch(getPaperlessHeadlessUrl("/auth/provider/token"), {
    body: JSON.stringify({
      client_id: options.clientId,
      id_token: options.idToken,
      provider: options.provider,
      token: options.token,
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  const data = (await response.json()) as PaperlessSessionResponse
  return {
    ok: response.ok,
    ...data,
  }
}

export function resolvePaperlessSsoState(errorCode: string | null) {
  switch (errorCode) {
    case "paperless-sso-provider-signup":
      return "provider-signup"
    case "paperless-sso-verify-email":
      return "verify-email"
    case "paperless-sso-mfa":
      return "mfa"
    default:
      return null
  }
}

export function resolvePendingPaperlessFlow(
  result: PaperlessSessionResponse | null | undefined
) {
  const flow =
    result?.data?.flows?.find((candidate) => candidate.is_pending) ??
    result?.data?.flows?.[0]

  switch (flow?.id) {
    case "provider_signup":
      return "paperless-sso-provider-signup"
    case "verify_email":
      return "paperless-sso-verify-email"
    case "mfa_authenticate":
    case "mfa_login_webauthn":
    case "mfa_reauthenticate":
      return "paperless-sso-mfa"
    default:
      return "paperless-sso-error"
  }
}

export function buildPaperlessLoginRedirect(callbackUrl: string, errorCode: string) {
  const params = new URLSearchParams({
    callbackUrl,
    error: errorCode,
  })

  return `/login?${params.toString()}`
}

export function createPaperlessSsoStatePayload(options: {
  callbackUrl: string
  provider: string
}) {
  return {
    callbackUrl: options.callbackUrl,
    nonce: randomBytes(16).toString("hex"),
    provider: options.provider,
    state: randomBytes(16).toString("hex"),
  } satisfies PaperlessSsoStatePayload
}

export function buildPaperlessDisplayName(user: PaperlessSessionUser | undefined) {
  return (
    user?.display?.trim() ||
    user?.username?.trim() ||
    user?.email?.trim() ||
    "Paperless User"
  )
}

export function isAuthenticatedPaperlessSession(
  result: PaperlessSessionResponse | null | undefined
): result is PaperlessSessionResponse & {
  data: {
    user?: PaperlessSessionUser
  }
  meta: {
    access_token: string
    is_authenticated: true
  }
} {
  return Boolean(
    result?.meta?.is_authenticated &&
      typeof result?.meta?.access_token === "string"
  )
}
