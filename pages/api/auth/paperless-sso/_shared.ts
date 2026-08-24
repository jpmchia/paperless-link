import type { NextApiRequest, NextApiResponse } from "next"

import { clearLinkSessionCookie, createLinkSessionCookie } from "@/auth"
import {
  buildPaperlessDisplayName,
  buildPaperlessLoginRedirect,
  clearPaperlessSsoCookies,
  isAuthenticatedPaperlessSession,
  type PaperlessSessionResponse,
  readPaperlessSsoStateCookie,
  resolvePendingPaperlessFlow,
  serializePaperlessSsoSessionCookie,
  type PaperlessSsoStatePayload,
} from "@/lib/paperless-sso"

function appendCookies(
  res: NextApiResponse,
  cookies: string | string[] | undefined
) {
  if (!cookies) {
    return
  }

  const nextCookies = Array.isArray(cookies) ? cookies : [cookies]
  const existing = res.getHeader("Set-Cookie")
  const existingCookies = Array.isArray(existing)
    ? existing
    : existing
      ? [String(existing)]
      : []

  res.setHeader("Set-Cookie", [...existingCookies, ...nextCookies])
}

export async function getPendingPaperlessState(req: NextApiRequest) {
  return readPaperlessSsoStateCookie(req)
}

export function redirectToPaperlessLoginError(
  res: NextApiResponse,
  state: PaperlessSsoStatePayload | null,
  errorCode: string,
  options: {
    clearPending?: boolean
  } = {}
) {
  const callbackUrl = state?.callbackUrl ?? "/dashboard"
  const cookies: string[] = []

  if (options.clearPending !== false) {
    cookies.push(...clearPaperlessSsoCookies())
  }

  appendCookies(res, cookies)
  res.redirect(302, buildPaperlessLoginRedirect(callbackUrl, errorCode))
}

export async function finalizePaperlessSessionResult(
  req: NextApiRequest,
  res: NextApiResponse,
  result: PaperlessSessionResponse
) {
  const state = await getPendingPaperlessState(req)

  if (isAuthenticatedPaperlessSession(result)) {
    const user = result.data?.user
    const clearedSsoCookies = clearPaperlessSsoCookies()
    appendCookies(res, [
      ...clearedSsoCookies,
      clearLinkSessionCookie(),
      await createLinkSessionCookie({
        email: user?.email ?? null,
        id: String(user?.id ?? buildPaperlessDisplayName(user)),
        name: buildPaperlessDisplayName(user),
        token: result.meta.access_token,
      }),
    ])
    res.redirect(302, state?.callbackUrl ?? "/dashboard")
    return
  }

  const updatedSessionToken =
    typeof result?.meta?.session_token === "string"
      ? result.meta.session_token
      : null

  if (updatedSessionToken) {
    appendCookies(res, await serializePaperlessSsoSessionCookie(updatedSessionToken))
  }

  redirectToPaperlessLoginError(res, state, resolvePendingPaperlessFlow(result), {
    clearPending: false,
  })
}
