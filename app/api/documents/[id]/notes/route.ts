import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { NextResponse } from "next/server"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"

async function getToken() {
  const session = await getServerSession(authOptions as any)
  const token = (session as any)?.accessToken
  if (!token) return null
  return token
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const resolvedParams = await params
  const res = await fetch(`${baseUrl}api/documents/${resolvedParams.id}/notes/`, {
    headers: {
      Authorization: `Token ${token}`,
      Accept: "application/json; version=2",
    },
  })
  if (!res.ok) return NextResponse.json({ error: "Failed" }, { status: res.status })
  const data = await res.json()
  return NextResponse.json(data)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const resolvedParams = await params
  const res = await fetch(`${baseUrl}api/documents/${resolvedParams.id}/notes/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json; version=2",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    return NextResponse.json({ error: err }, { status: res.status })
  }
  const data = await res.json()
  return NextResponse.json(data)
}
