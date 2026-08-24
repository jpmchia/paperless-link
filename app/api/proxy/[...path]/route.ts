import { NextResponse } from "next/server"
import {
  getPaperlessBaseUrl,
  paperlessJsonAccept,
  resolvePaperlessAccessToken,
} from "@/lib/paperless-transport"

async function proxyRequest(req: Request, params: Promise<{ path: string[] }>) {
  const token = await resolvePaperlessAccessToken()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const resolvedParams = await params
  const path = resolvedParams.path.join("/")
  const url = new URL(req.url)
  const queryString = url.search
  const proxiedPath = path.endsWith("/") ? path : `${path}/`
  const headers: Record<string, string> = {
    Authorization: `Token ${token}`,
    Accept: req.headers.get("accept")?.trim() || paperlessJsonAccept(),
  }

  let body: BodyInit | undefined
  if (req.method !== "GET" && req.method !== "HEAD") {
    const contentType = req.headers.get("content-type")
    if (contentType?.includes("application/json")) {
      headers["Content-Type"] = "application/json"
      body = await req.text()
    } else if (contentType?.includes("multipart/form-data")) {
      body = await req.formData()
    }
  }
  const res = await fetch(
    `${getPaperlessBaseUrl()}api/${proxiedPath}${queryString}`,
    {
      method: req.method,
      headers,
      body,
    }
  )

  if (req.method === "DELETE" && res.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  const contentType = res.headers.get("content-type") || ""
  // Stream non-JSON (binary / text/event-stream) without buffering as JSON
  if (!contentType.includes("application/json")) {
    const passthrough = new Headers()
    passthrough.set("Content-Type", contentType)
    const disposition = res.headers.get("Content-Disposition")
    if (disposition) passthrough.set("Content-Disposition", disposition)
    const length = res.headers.get("Content-Length")
    if (length) passthrough.set("Content-Length", length)
    return new NextResponse(res.body, {
      status: res.status,
      headers: passthrough,
    })
  }

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params)
}

export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params)
}

export async function PUT(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params)
}
