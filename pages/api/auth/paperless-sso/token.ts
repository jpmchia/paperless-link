import type { NextApiRequest, NextApiResponse } from "next"

import { normalizeCallbackUrl, postPaperlessHeadlessProviderToken } from "@/lib/paperless-sso"
import {
  finalizePaperlessSessionResult,
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

  const provider =
    typeof req.body?.provider === "string" ? req.body.provider.trim() : ""
  const callbackUrl = normalizeCallbackUrl(
    req.body?.callbackUrl,
    `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host || ""}`
  )

  if (!provider || !callbackUrl) {
    res.status(400).json({
      error: "Provider and callback URL are required.",
    })
    return
  }

  const result = await postPaperlessHeadlessProviderToken({
    clientId:
      typeof req.body?.clientId === "string" ? req.body.clientId.trim() : undefined,
    idToken:
      typeof req.body?.idToken === "string" ? req.body.idToken.trim() : undefined,
    provider,
    token: typeof req.body?.token === "string" ? req.body.token.trim() : undefined,
  })

  if (!result.meta?.is_authenticated && !result.data?.flows?.length) {
    redirectToPaperlessLoginError(
      res,
      callbackUrl ? { callbackUrl, nonce: "", provider, state: "" } : null,
      "paperless-sso-error"
    )
    return
  }

  await finalizePaperlessSessionResult(req, res, result)
}
