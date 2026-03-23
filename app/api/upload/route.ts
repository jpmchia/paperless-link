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

  const formData = await req.formData()

  // Forward the form data as-is to the Paperless API
  const res = await fetch(`${baseUrl}api/documents/post_document/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: 200 })
}
