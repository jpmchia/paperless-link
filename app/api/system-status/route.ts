import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"

async function getToken() {
  const session = (await getServerSession(authOptions)) as
    | { accessToken?: unknown }
    | null
  return typeof session?.accessToken === "string" ? session.accessToken : null
}

export async function GET() {
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const res = await fetch(`${baseUrl}api/status/`, {
    cache: "no-store",
    headers: {
      Accept: "application/json; version=2",
      Authorization: `Token ${token}`,
    },
  })

  if (!res.ok) {
    const error = await res.text().catch(() => res.statusText)
    return NextResponse.json({ error }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
