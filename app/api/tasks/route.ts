import { NextResponse } from "next/server"
import {
  fetchPaperlessTasksUpstream,
  getPaperlessApiVersionForTasks,
} from "@/lib/paperless-task-routes"
import { normalizePaperlessTaskPage } from "@/lib/paperless-tasks"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const params = new URLSearchParams(url.search)

  if (!params.has("acknowledged")) {
    params.set("acknowledged", "false")
  }

  const page = Math.max(1, Number(params.get("page") || "1") || 1)
  const pageSize = Math.max(1, Number(params.get("page_size") || "25") || 25)
  if (!params.has("page")) params.set("page", String(page))
  if (!params.has("page_size")) params.set("page_size", String(pageSize))

  const res = await fetchPaperlessTasksUpstream("tasks/", params)
  if (res.status === 401) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Failed" }, { status: res.status })
  }

  const data = await res.json()
  const apiVersion = getPaperlessApiVersionForTasks()
  const normalized =
    apiVersion >= 10
      ? normalizePaperlessTaskPage(data)
      : normalizePaperlessTaskPage(data, { page, pageSize })

  return NextResponse.json(normalized)
}
