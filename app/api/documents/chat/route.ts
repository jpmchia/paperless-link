import { NextResponse } from "next/server"
import {
  getPaperlessBaseUrl,
  resolvePaperlessAccessToken,
} from "@/lib/paperless-transport"

function passthroughHeaders(upstream: Response) {
  const headers = new Headers()
  const contentType = upstream.headers.get("content-type") ?? "text/event-stream"
  headers.set("Content-Type", contentType)

  const cacheControl = upstream.headers.get("cache-control")
  if (cacheControl) {
    headers.set("Cache-Control", cacheControl)
  }

  const contentLength = upstream.headers.get("content-length")
  if (contentLength) {
    headers.set("Content-Length", contentLength)
  }

  return headers
}

export async function POST(req: Request) {
  const token = await resolvePaperlessAccessToken()
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const upstream = await fetch(`${getPaperlessBaseUrl()}api/documents/chat/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: await req.text(),
  })

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: passthroughHeaders(upstream),
  })
}
