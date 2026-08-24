import type { NextApiRequest, NextApiResponse } from "next"

import {
  postPaperlessHeadlessProviderSignup,
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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    res.status(405).json({ error: "Method not allowed." })
    return
  }

  const state = await getPendingPaperlessState(req)
  const sessionToken = await readPaperlessSsoSessionCookie(req)
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : ""

  if (!state || !sessionToken) {
    redirectToPaperlessLoginError(res, state, "paperless-sso-error")
    return
  }

  if (!email) {
    redirectToPaperlessLoginError(res, state, "paperless-sso-provider-signup", {
      clearPending: false,
    })
    return
  }

  const result = await postPaperlessHeadlessProviderSignup({
    email,
    sessionToken,
  })

  await finalizePaperlessSessionResult(req, res, result)
}
