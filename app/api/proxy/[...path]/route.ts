import { NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"

async function getPaperlessToken() {
  const configuredToken = process.env.PAPERLESS_API_TOKEN?.trim()
  if (configuredToken) return configuredToken

  let fileToken: string | null = null
  const candidates = [join(process.cwd(), ".env.local"), join(process.cwd(), ".env")]
  for (const filePath of candidates) {
    try {
      const content = await readFile(filePath, "utf8")
      const match = content.match(/^PAPERLESS_API_TOKEN=(.+)$/m)
      if (!match?.[1]) continue
      const raw = match[1].trim()
      const value = raw.split("#")[0]?.trim()
      if (value) {
        fileToken = value
        break
      }
    } catch {
      // ignore missing env files
    }
  }
  return fileToken
}

async function proxyRequest(req: Request, params: Promise<{ path: string[] }>) {
  const token = await getPaperlessToken()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const resolvedParams = await params
  const path = resolvedParams.path.join("/")
  const url = new URL(req.url)
  const queryString = url.search
  const proxiedPath = path.endsWith("/") ? path : `${path}/`
  const headers: Record<string, string> = {
    Authorization: `Token ${token}`,
    Accept: req.headers.get("accept")?.trim() || "application/json; version=2",
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
  const res = await fetch(`${baseUrl}api/${proxiedPath}${queryString}`, {
    method: req.method,
    headers,
    body,
  })

  if (req.method === "DELETE" && res.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  const contentType = res.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  }

  // Stream binary responses
  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      "Content-Type": contentType,
    },
  })
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
