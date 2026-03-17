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

export async function POST(req: Request) {
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: { task_name?: string } = {}

  try {
    payload = (await req.json()) as { task_name?: string }
  } catch {
    payload = {}
  }

  if (!payload.task_name) {
    return NextResponse.json(
      { error: "task_name is required" },
      { status: 400 }
    )
  }

  const res = await fetch(`${baseUrl}api/tasks/run/`, {
    method: "POST",
    headers: {
      Accept: "application/json; version=2",
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ task_name: payload.task_name }),
  })

  if (!res.ok) {
    const error = await res.text().catch(() => res.statusText)
    return NextResponse.json({ error }, { status: res.status })
  }

  const data = await res.json().catch(() => ({ ok: true }))
  return NextResponse.json(data)
}
