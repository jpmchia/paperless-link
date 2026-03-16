import { createPaperlessClientError } from "@/lib/errors"

type Primitive = string | number | boolean

export interface JsonRequestInit extends Omit<RequestInit, "body"> {
  body?: BodyInit | Record<string, unknown> | null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof FormData) &&
    !(value instanceof Blob) &&
    !(value instanceof URLSearchParams)
  )
}

function normalizeHeaders(
  headers: HeadersInit | undefined,
  body: JsonRequestInit["body"]
): Headers {
  const nextHeaders = new Headers(headers)

  if (
    body != null &&
    isPlainObject(body) &&
    !nextHeaders.has("Content-Type")
  ) {
    nextHeaders.set("Content-Type", "application/json")
  }

  return nextHeaders
}

function normalizeBody(body: JsonRequestInit["body"]): BodyInit | undefined {
  if (body == null) return undefined
  if (isPlainObject(body)) return JSON.stringify(body)
  return body
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init: JsonRequestInit = {}
): Promise<T> {
  const headers = normalizeHeaders(init.headers, init.body)
  const response = await fetch(input, {
    ...init,
    headers,
    body: normalizeBody(init.body),
  })

  if (!response.ok) {
    throw await createPaperlessClientError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    return undefined as T
  }

  return (await response.json()) as T
}

export function getJson<T>(input: RequestInfo | URL, init?: JsonRequestInit) {
  return requestJson<T>(input, { ...init, method: init?.method ?? "GET" })
}

export function postJson<T>(
  input: RequestInfo | URL,
  body?: JsonRequestInit["body"],
  init?: JsonRequestInit
) {
  return requestJson<T>(input, { ...init, method: "POST", body })
}

export function patchJson<T>(
  input: RequestInfo | URL,
  body?: JsonRequestInit["body"],
  init?: JsonRequestInit
) {
  return requestJson<T>(input, { ...init, method: "PATCH", body })
}

export function putJson<T>(
  input: RequestInfo | URL,
  body?: JsonRequestInit["body"],
  init?: JsonRequestInit
) {
  return requestJson<T>(input, { ...init, method: "PUT", body })
}

export function deleteJson<T>(
  input: RequestInfo | URL,
  init?: JsonRequestInit
) {
  return requestJson<T>(input, { ...init, method: "DELETE" })
}

export function withQuery(
  path: string,
  params: Record<string, Primitive | null | undefined>
) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue
    searchParams.set(key, String(value))
  }

  const query = searchParams.toString()
  return query ? `${path}?${query}` : path
}
