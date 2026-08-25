import {
  getPaperlessApiVersion,
  getPaperlessBaseUrl,
  paperlessJsonAccept,
  resolvePaperlessAccessToken,
} from "@/lib/paperless-transport"
import { mapTaskNameFilterToTaskType } from "@/lib/paperless-tasks"

export async function fetchPaperlessTasksUpstream(
  path: string,
  searchParams?: URLSearchParams
): Promise<Response> {
  const token = await resolvePaperlessAccessToken()
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const apiVersion = getPaperlessApiVersion()
  let params = new URLSearchParams(searchParams)
  params = mapTaskNameFilterToTaskType(params, apiVersion)
  const query = params.toString()
  const url = `${getPaperlessBaseUrl()}api/${path}${query ? `?${query}` : ""}`

  return fetch(url, {
    headers: {
      Authorization: `Token ${token}`,
      Accept: paperlessJsonAccept(apiVersion),
    },
    cache: "no-store",
  })
}

export function getPaperlessApiVersionForTasks() {
  return getPaperlessApiVersion()
}
