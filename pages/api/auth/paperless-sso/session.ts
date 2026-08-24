import type { NextApiRequest, NextApiResponse } from "next"

import {
  fetchPaperlessHeadlessSession,
  readPaperlessSsoSessionCookie,
  resolvePendingPaperlessFlow,
} from "@/lib/paperless-sso"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET")
    res.status(405).json({ error: "Method not allowed." })
    return
  }

  const sessionToken = await readPaperlessSsoSessionCookie(req)
  if (!sessionToken) {
    res.status(401).json({
      error: "No pending Paperless SSO session.",
      isAuthenticated: false,
    })
    return
  }

  const result = await fetchPaperlessHeadlessSession(sessionToken)

  res.status(result.status ?? (result.ok ? 200 : 401)).json({
    error: result.errors?.[0]?.message ?? null,
    hasAccessToken: typeof result.meta?.access_token === "string",
    isAuthenticated: Boolean(result.meta?.is_authenticated),
    pendingFlow: result.meta?.is_authenticated
      ? null
      : resolvePendingPaperlessFlow(result),
    user: result.data?.user ?? null,
  })
}
