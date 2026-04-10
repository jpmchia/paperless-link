import { invokeLinkIQAction } from "@/lib/link-iq"

export type ValidatedSession = {
  dataroomID: string
  slug: string
  token: string
}

function parseTokenMap(): Record<string, string> {
  const raw = process.env.DATAROOMS_PAPERLESS_API_TOKENS_JSON?.trim()
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const normalized: Record<string, string> = {}
    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        normalized[key] = value.trim()
      }
    })
    return normalized
  } catch {
    return {}
  }
}

const DATAROOM_TOKEN_MAP = parseTokenMap()

export function getPaperlessBaseUrl() {
  const raw = process.env.PAPERLESS_API_URL || "http://localhost:8000/"
  return raw.endsWith("/") ? raw : `${raw}/`
}

export async function validateDataroomSession(request: Request) {
  const url = new URL(request.url)
  const token = (url.searchParams.get("token") || "").trim()
  const slug = (url.searchParams.get("slug") || "").trim()
  if (!token || !slug) {
    throw new Error("token and slug are required")
  }

  const validated = await invokeLinkIQAction<{
    dataroom?: { dataroom_id?: string }
  }>({
    capability: "dataroom.session.validate",
    input: { token, slug },
  })
  const dataroomID = validated.dataroom?.dataroom_id?.trim()
  if (!dataroomID) {
    throw new Error("Invalid dataroom session")
  }

  return { token, slug, dataroomID } satisfies ValidatedSession
}

export function resolvePaperlessToken(session: ValidatedSession) {
  return (
    DATAROOM_TOKEN_MAP[session.dataroomID] ||
    DATAROOM_TOKEN_MAP[session.slug] ||
    process.env.PAPERLESS_API_TOKEN?.trim() ||
    ""
  )
}

