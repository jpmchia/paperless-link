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

export async function GET() {
  const token = await getToken()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const res = await fetch(`${baseUrl}api/logs/`, {
    headers: {
      Authorization: `Token ${token}`,
      Accept: "application/json; version=2",
    },
    cache: "no-store",
  })
  if (!res.ok) return NextResponse.json({ error: "Failed" }, { status: res.status })
  const data = await res.json()
  return NextResponse.json(data)
}
