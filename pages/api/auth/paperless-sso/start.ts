import type { NextApiRequest, NextApiResponse } from "next"

import {
  createPaperlessSsoStatePayload,
  extractPaperlessSsoProviders,
  fetchPaperlessSsoConfig,
  getRequestOrigin,
  normalizeCallbackUrl,
  postPaperlessHeadlessProviderRedirect,
  serializePaperlessSsoSessionCookie,
  serializePaperlessSsoStateCookie,
} from "@/lib/paperless-sso"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    res.status(405).json({ error: "Method not allowed." })
    return
  }

  const origin = getRequestOrigin(req)
  const callbackUrl = normalizeCallbackUrl(req.body?.callbackUrl, origin)
  const provider =
    typeof req.body?.provider === "string" ? req.body.provider.trim() : ""

  if (!callbackUrl) {
    res.status(400).json({ error: "Invalid callback URL." })
    return
  }

  if (!provider) {
    res.status(400).json({ error: "Provider is required." })
    return
  }

  const config = await fetchPaperlessSsoConfig()
  const configuredProviders = extractPaperlessSsoProviders(config)

  if (!configuredProviders.some((candidate) => candidate.id === provider)) {
    res.status(400).json({ error: "Unknown Paperless SSO provider." })
    return
  }

  const statePayload = createPaperlessSsoStatePayload({
    callbackUrl,
    provider,
  })
  const redirectCallbackUrl = new URL(
    `/api/auth/paperless-sso/callback?link_state=${encodeURIComponent(statePayload.state)}`,
    origin
  ).toString()
  const redirectResult = await postPaperlessHeadlessProviderRedirect({
    callbackUrl: redirectCallbackUrl,
    provider,
  })

  const redirectUrl = redirectResult.data?.redirect_url
  if (!redirectResult.ok || typeof redirectUrl !== "string") {
    res
      .status(502)
      .json({ error: "Unable to start Paperless SSO." })
    return
  }

  const cookies = [
    await serializePaperlessSsoStateCookie(statePayload),
  ]

  if (typeof redirectResult.meta?.session_token === "string") {
    cookies.push(
      await serializePaperlessSsoSessionCookie(redirectResult.meta.session_token)
    )
  }

  res.setHeader("Set-Cookie", cookies)
  res.redirect(302, redirectUrl)
}
