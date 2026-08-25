import { NextResponse } from "next/server"
import { fetchPaperlessTasksUpstream } from "@/lib/paperless-task-routes"
import { normalizeTaskStatusCounts } from "@/lib/paperless-tasks"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const params = new URLSearchParams(url.search)

  const res = await fetchPaperlessTasksUpstream("tasks/status_counts/", params)
  if (res.status === 401) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Failed" }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(normalizeTaskStatusCounts(data))
}
