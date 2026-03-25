type LinkIQActionRequest = {
  capability: string
  input?: Record<string, unknown>
  resource_id?: string
  source_id?: string
}

type LinkIQExecutionResponse<T> = {
  error?: string
  execution?: {
    error?: string
    result?: T
    status?: string
  }
}

function normalizeLinkIQBaseUrl(rawValue: string | undefined) {
  const trimmed = (rawValue || "http://127.0.0.1:8080/").trim()
  return trimmed.replace(/\/api\/v1\/?$/i, "/").replace(/\/?$/, "/")
}

const linkIQBaseUrl = normalizeLinkIQBaseUrl(process.env.LINK_IQ_API_URL)

export const LINK_IQ_SOURCE_ID = process.env.LINK_IQ_SOURCE_ID || "example-ngx"

async function extractError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string }
    if (payload?.error) return payload.error
  } catch {
    // Fall back to the HTTP status text below.
  }

  return response.statusText || "Request failed"
}

export async function requestLinkIQJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers)
  const token = process.env.LINK_IQ_API_TOKEN

  headers.set("Accept", "application/json")
  if (!headers.has("Content-Type") && init.body != null) {
    headers.set("Content-Type", "application/json")
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(new URL(path, linkIQBaseUrl), {
      ...init,
      headers,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(5000),
    })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new Error("Timed out connecting to link-iq")
    }
    throw error
  }

  if (!response.ok) {
    throw new Error(await extractError(response))
  }

  return (await response.json()) as T
}

export async function invokeLinkIQAction<T>(
  request: LinkIQActionRequest
): Promise<T> {
  const payload = await requestLinkIQJson<LinkIQExecutionResponse<T>>(
    "api/v1/mcp/actions",
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  )

  if (payload.error) {
    throw new Error(payload.error)
  }
  if (payload.execution?.error) {
    throw new Error(payload.execution.error)
  }

  return (payload.execution?.result ?? {}) as T
}
