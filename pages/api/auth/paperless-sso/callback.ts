import type { NextApiRequest, NextApiResponse } from "next"

import {
  clearPaperlessSsoCookies,
  fetchPaperlessHeadlessSession,
  readPaperlessSsoSessionCookie,
} from "@/lib/paperless-sso"
import {
  finalizePaperlessSessionResult,
  getPendingPaperlessState,
  redirectToPaperlessLoginError,
} from "@/pages/api/auth/paperless-sso/_shared"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET")
    res.status(405).json({ error: "Method not allowed." })
    return
  }

  const state = await getPendingPaperlessState(req)
  const returnedState = Array.isArray(req.query.link_state)
    ? req.query.link_state[0]
    : req.query.link_state

  if (!state || !returnedState || returnedState !== state.state) {
    res.setHeader("Set-Cookie", clearPaperlessSsoCookies())
    res.redirect(
      302,
      `/login?callbackUrl=${encodeURIComponent(state?.callbackUrl ?? "/dashboard")}&error=paperless-sso-error`
    )
    return
  }

  if (typeof req.query.error === "string") {
    redirectToPaperlessLoginError(res, state, "paperless-sso-error")
    return
  }

  const sessionToken = await readPaperlessSsoSessionCookie(req)
  if (!sessionToken) {
    redirectToPaperlessLoginError(res, state, "paperless-sso-error")
    return
  }

  const sessionResult = await fetchPaperlessHeadlessSession(sessionToken)

  await finalizePaperlessSessionResult(req, res, sessionResult)
}
