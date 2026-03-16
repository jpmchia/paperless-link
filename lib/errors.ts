export interface PaperlessErrorDetails {
  body?: unknown
  status: number
  statusText: string
  url: string
}

export class PaperlessClientError extends Error {
  body?: unknown
  status: number
  statusText: string
  url: string

  constructor(message: string, details: PaperlessErrorDetails) {
    super(message)
    this.name = "PaperlessClientError"
    this.body = details.body
    this.status = details.status
    this.statusText = details.statusText
    this.url = details.url
  }
}

function getBodyMessage(body: unknown): string | null {
  if (!body) return null
  if (typeof body === "string") return body.trim() || null
  if (typeof body !== "object") return null

  const messageKeys = ["detail", "message", "error", "non_field_errors"]
  for (const key of messageKeys) {
    const value = (body as Record<string, unknown>)[key]
    if (typeof value === "string" && value.trim()) return value
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0]
      if (typeof first === "string" && first.trim()) return first
    }
  }

  return null
}

export async function createPaperlessClientError(
  response: Response
): Promise<PaperlessClientError> {
  const contentType = response.headers.get("content-type") ?? ""
  let body: unknown

  try {
    if (contentType.includes("application/json")) {
      body = await response.json()
    } else {
      const text = await response.text()
      body = text || undefined
    }
  } catch {
    body = undefined
  }

  const message =
    getBodyMessage(body) ??
    response.statusText ??
    `Request failed with status ${response.status}`

  return new PaperlessClientError(message, {
    body,
    status: response.status,
    statusText: response.statusText,
    url: response.url,
  })
}

export function toErrorMessage(
  error: unknown,
  fallback = "Something went wrong"
): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === "string" && error.trim()) return error
  return fallback
}
