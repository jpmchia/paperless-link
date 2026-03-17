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

export async function POST(req: Request) {
  const token = await getToken()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let payload: { tasks?: number[] } = {}

  try {
    payload = (await req.json()) as { tasks?: number[] }
  } catch {
    payload = {}
  }

  const res = await fetch(`${baseUrl}api/tasks/acknowledge/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json; version=2",
    },
    body: JSON.stringify({
      tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    return NextResponse.json({ error: err }, { status: res.status })
  }
  const data = await res.json().catch(() => ({ ok: true }))
  return NextResponse.json(data)
}
