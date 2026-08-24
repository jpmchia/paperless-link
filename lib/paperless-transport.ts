import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export type PaperlessApiVersion = 9 | 10

const DEFAULT_API_VERSION: PaperlessApiVersion = 10

export function getPaperlessBaseUrl(): string {
  return process.env.PAPERLESS_API_URL || "http://localhost:8000/"
}

export function getPaperlessApiVersion(
  env?: { PAPERLESS_API_VERSION?: string | undefined }
): PaperlessApiVersion {
  const raw = (env ?? process.env).PAPERLESS_API_VERSION?.trim()
  if (!raw) return DEFAULT_API_VERSION
  if (raw === "9") return 9
  if (raw === "10") return 10
  throw new Error(
    `Invalid PAPERLESS_API_VERSION="${raw}". Expected "9" or "10".`
  )
}

export function paperlessJsonAccept(
  version: PaperlessApiVersion = getPaperlessApiVersion()
): string {
  return `application/json; version=${version}`
}

export function paperlessAuthHeaders(
  token: string,
  options: {
    contentType?: string | null
    accept?: string
    extra?: HeadersInit
  } = {}
): Headers {
  const headers = new Headers(options.extra)
  headers.set("Authorization", `Token ${token}`)
  headers.set("Accept", options.accept ?? paperlessJsonAccept())
  if (options.contentType) {
    headers.set("Content-Type", options.contentType)
  }
  return headers
}

/**
 * Resolve the Paperless API token for server-side requests.
 * Prefer the authenticated user's session token; fall back to
 * PAPERLESS_API_TOKEN only as an explicit service-account override.
 */
export async function resolvePaperlessAccessToken(options?: {
  preferServiceToken?: boolean
}): Promise<string | null> {
  const configuredToken = process.env.PAPERLESS_API_TOKEN?.trim() || null
  if (options?.preferServiceToken && configuredToken) {
    return configuredToken
  }

  const session = (await getServerSession(authOptions)) as
    | { accessToken?: unknown }
    | null
  const sessionToken =
    typeof session?.accessToken === "string" ? session.accessToken : null

  return sessionToken || configuredToken
}

export function paperlessApiUrl(
  endpoint: string,
  baseUrl: string = getPaperlessBaseUrl()
): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  const path = endpoint.replace(/^\/+/, "")
  return `${normalizedBase}api/${path}`
}
