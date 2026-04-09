import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"

type RequestLinkInput = {
  slug?: string
  email?: string
  purpose?: "login" | "activation"
}

function resolvePublicBaseURL(request: Request): string {
  const envBaseURL =
    process.env.LINK_IQ_PUBLIC_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || ""
  if (envBaseURL) return envBaseURL

  const originHeader = request.headers.get("origin")?.trim()
  if (originHeader) return originHeader

  const refererHeader = request.headers.get("referer")?.trim()
  if (refererHeader) {
    try {
      return new URL(refererHeader).origin
    } catch {
      // Fall through to forwarded/host resolution.
    }
  }

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
  const host = request.headers.get("host")?.trim()
  const url = new URL(request.url)

  const protocol = forwardedProto || (url.protocol === "https:" ? "https" : "http")
  const resolvedHost = forwardedHost || host || url.host
  if (resolvedHost) {
    return `${protocol}://${resolvedHost}`
  }
  return url.origin
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestLinkInput
    const publicBaseURL = resolvePublicBaseURL(request)
    const result = await invokeLinkIQAction<{ magic_link?: string }>({
      capability: "dataroom.magic_link.issue",
      input: {
        slug: body.slug,
        email: body.email,
        purpose: body.purpose || "login",
        public_base_url: publicBaseURL,
      },
    })

    return NextResponse.json({
      issued: Boolean(result.magic_link),
      magic_link: result.magic_link ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to issue magic link" },
      { status: 500 }
    )
  }
}
