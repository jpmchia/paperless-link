import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const session = (await getServerSession(authOptions)) as
    | { accessToken?: string }
    | null
  const configuredToken = process.env.PAPERLESS_API_TOKEN?.trim()
  const token = configuredToken || session?.accessToken?.trim()

  if (!token) {
    return new Response("Unauthorized", { status: 401 })
  }

  const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"
  const requestUrl = new URL(request.url)
  const targetUrl = new URL(`${baseUrl}api/documents/${params.id}/download/`)

  for (const key of ["original", "version", "follow_formatting"]) {
    const value = requestUrl.searchParams.get(key)
    if (value != null) {
      targetUrl.searchParams.set(key, value)
    }
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        Authorization: `Token ${token}`,
      },
    })

    const headers = new Headers()
    const contentType = response.headers.get("Content-Type")
    const contentDisposition = response.headers.get("Content-Disposition")
    const contentLength = response.headers.get("Content-Length")

    if (contentType) {
      headers.set("Content-Type", contentType)
    }
    if (contentDisposition) {
      headers.set("Content-Disposition", contentDisposition)
    }
    if (contentLength) {
      headers.set("Content-Length", contentLength)
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (error) {
    console.error("Download Proxy Error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
