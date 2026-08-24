import { NextResponse } from "next/server"
import {
  getPaperlessBaseUrl,
  paperlessJsonAccept,
  resolvePaperlessAccessToken,
} from "@/lib/paperless-transport"

export async function POST(req: Request) {
  const token = await resolvePaperlessAccessToken()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let payload: { tasks?: number[] } = {}

  try {
    payload = (await req.json()) as { tasks?: number[] }
  } catch {
    payload = {}
  }

  const res = await fetch(`${getPaperlessBaseUrl()}api/tasks/acknowledge/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: paperlessJsonAccept(),
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
