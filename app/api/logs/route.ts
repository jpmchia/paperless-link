import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { NextResponse } from "next/server"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"

async function getToken() {
  const session = (await getServerSession(authOptions)) as
    | { accessToken?: unknown }
    | null
  return typeof session?.accessToken === "string" ? session.accessToken : null
}

export async function GET(req: Request) {
  const token = await getToken()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const requestUrl = new URL(req.url)
  const file = requestUrl.searchParams.get("file")
  const limit = requestUrl.searchParams.get("limit")
  const logPath = file ? `logs/${encodeURIComponent(file)}/` : "logs/"
  const query = new URLSearchParams()

  if (file && limit) {
    query.set("limit", limit)
  }

  const res = await fetch(
    `${baseUrl}api/${logPath}${query.toString() ? `?${query.toString()}` : ""}`,
    {
    headers: {
      Authorization: `Token ${token}`,
      Accept: "application/json; version=2",
    },
    cache: "no-store",
    }
  )
  if (!res.ok) return NextResponse.json({ error: "Failed" }, { status: res.status })
  const data = await res.json()
  return NextResponse.json(data)
}
