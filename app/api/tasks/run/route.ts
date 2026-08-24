import { NextResponse } from "next/server"
import {
  getPaperlessApiVersion,
  getPaperlessBaseUrl,
  paperlessJsonAccept,
  resolvePaperlessAccessToken,
} from "@/lib/paperless-transport"

export async function POST(req: Request) {
  const token = await resolvePaperlessAccessToken()
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: { task_name?: string; task_type?: string } = {}

  try {
    payload = (await req.json()) as { task_name?: string; task_type?: string }
  } catch {
    payload = {}
  }

  const apiVersion = getPaperlessApiVersion()
  const taskType = payload.task_type || payload.task_name
  if (!taskType) {
    return NextResponse.json(
      { error: apiVersion >= 10 ? "task_type is required" : "task_name is required" },
      { status: 400 }
    )
  }

  const body =
    apiVersion >= 10
      ? { task_type: taskType }
      : { task_name: taskType }

  const res = await fetch(`${getPaperlessBaseUrl()}api/tasks/run/`, {
    method: "POST",
    headers: {
      Accept: paperlessJsonAccept(apiVersion),
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.text().catch(() => res.statusText)
    return NextResponse.json({ error }, { status: res.status })
  }

  const data = await res.json().catch(() => ({ ok: true }))
  return NextResponse.json(data)
}
