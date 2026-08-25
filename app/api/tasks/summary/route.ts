import { NextResponse } from "next/server"
import { fetchPaperlessTasksUpstream } from "@/lib/paperless-task-routes"
import { normalizeTaskSummary } from "@/lib/paperless-tasks"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const params = new URLSearchParams(url.search)
  if (!params.has("days")) params.set("days", "30")

  const res = await fetchPaperlessTasksUpstream("tasks/summary/", params)
  if (res.status === 401) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Failed" }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(normalizeTaskSummary(data))
}
