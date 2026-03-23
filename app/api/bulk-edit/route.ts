import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { NextResponse } from "next/server"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"

async function getToken() {
  const session = await getServerSession(authOptions)
  const token = session?.accessToken
  if (!token) return null
  return token
}

export async function POST(req: Request) {
  const token = await getToken()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const res = await fetch(`${baseUrl}api/documents/bulk_edit/`, {
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
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data)
}
