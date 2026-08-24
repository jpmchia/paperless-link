import { NextResponse } from "next/server"
import {
  getPaperlessApiVersion,
  getPaperlessBaseUrl,
  paperlessJsonAccept,
  resolvePaperlessAccessToken,
} from "@/lib/paperless-transport"
import {
  mapTaskNameFilterToTaskType,
  normalizePaperlessTasksPayload,
} from "@/lib/paperless-tasks"

export async function GET(req: Request) {
  const token = await resolvePaperlessAccessToken()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const apiVersion = getPaperlessApiVersion()
  let params = new URLSearchParams(url.search)

  if (!params.has("acknowledged")) {
    params.set("acknowledged", "false")
  }

  params = mapTaskNameFilterToTaskType(params, apiVersion)

  const query = params.toString()
  const res = await fetch(
    `${getPaperlessBaseUrl()}api/tasks/${query ? `?${query}` : ""}`,
    {
      headers: {
        Authorization: `Token ${token}`,
        Accept: paperlessJsonAccept(apiVersion),
      },
      cache: "no-store",
    }
  )
  if (!res.ok) return NextResponse.json({ error: "Failed" }, { status: res.status })
  const data = await res.json()
  const normalized = normalizePaperlessTasksPayload(data)
  return NextResponse.json(normalized)
}
