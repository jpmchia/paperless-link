import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  const configuredToken = process.env.PAPERLESS_API_TOKEN?.trim()
  const token = configuredToken || session?.accessToken?.trim()

  if (!token) {
    return new Response("Unauthorized", { status: 401 })
  }

  const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"
  const requestUrl = new URL(request.url)
  const version = requestUrl.searchParams.get("version")
  const targetUrl = new URL(`${baseUrl}api/documents/${params.id}/thumb/`)

  if (version) {
    targetUrl.searchParams.set("version", version)
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        Authorization: `Token ${token}`,
        Accept: request.headers.get("accept")?.trim() || "image/webp,image/*,*/*;q=0.8",
      },
    })

    if (!response.ok) {
      return new Response(`Failed to fetch thumbnail: ${response.status}`, {
        status: response.status,
      })
    }

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/webp",
      },
    })
  } catch (error) {
    console.error("Thumbnail Proxy Error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
