import { paperlessJsonAccept } from "@/lib/paperless-transport"

const DOCUMENT_ID_PAGE_SIZE = 500

function getBaseUrl() {
  return process.env.PAPERLESS_API_URL || "http://localhost:8000/"
}

type DocumentSelectionLike = {
  all?: unknown
  documents?: unknown
  excluded_document_ids?: unknown
  filters?: unknown
}

function uniqueIds(ids: number[]) {
  return [...new Set(ids.filter((id) => Number.isInteger(id)))]
}

function normalizeDocumentIds(value: unknown) {
  return Array.isArray(value)
    ? uniqueIds(value.filter((id): id is number => Number.isInteger(id)))
    : []
}

function normalizeFilters(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue != null)
      .map(([key, entryValue]) => [key, String(entryValue)])
  )
}

function buildHeaders(token: string) {
  return {
    Authorization: `Token ${token}`,
    "Content-Type": "application/json",
    Accept: paperlessJsonAccept(),
  }
}

export async function listFilteredDocumentIds(
  token: string,
  filters: Record<string, string>
) {
  const ids: number[] = []
  let page = 1

  while (true) {
    const params = new URLSearchParams(filters)
    params.set("page", String(page))
    params.set("page_size", String(DOCUMENT_ID_PAGE_SIZE))
    params.set("fields", "id")

    const response = await fetch(`${getBaseUrl()}api/documents/?${params.toString()}`, {
      headers: buildHeaders(token),
    })

    if (!response.ok) {
      throw new Error(await response.text().catch(() => response.statusText))
    }

    const data = (await response.json()) as {
      next?: string | null
      results?: Array<{ id?: number }>
    }
    const pageIds = (data.results ?? [])
      .map((document) => document.id)
      .filter((id): id is number => Number.isInteger(id))

    ids.push(...pageIds)

    if (!data.next) {
      break
    }

    page += 1
  }

  return ids
}

export async function resolveSelectionDocumentIds(
  token: string,
  selection: DocumentSelectionLike
) {
  if (selection.all === true) {
    const documentIds = await listFilteredDocumentIds(
      token,
      normalizeFilters(selection.filters)
    )
    const excludedIds = new Set(
      normalizeDocumentIds(selection.excluded_document_ids)
    )

    return documentIds.filter((id) => !excludedIds.has(id))
  }

  return normalizeDocumentIds(selection.documents)
}
