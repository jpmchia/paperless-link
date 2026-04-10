/**
 * pdf.js / EmbedPDF issue many HTTP Range requests per document. Running full
 * dataroom session validation + document allowlist checks on every chunk makes
 * the viewer appear hung. Cache a successful (token, slug, folder, doc) → dataroom
 * mapping for a short window so follow-up Range requests only proxy to Paperless.
 *
 * Only consult this cache when the incoming request has a `Range` header: the first
 * full GET (no Range) must always validate so the viewer cannot start from a stale
 * or mismatched cache entry.
 */

const TTL_MS = 5 * 60 * 1000
const MAX_ENTRIES = 3000

type Entry = {
  dataroomID: string
  expiresAt: number
}

const store = new Map<string, Entry>()

function cacheKey(token: string, slug: string, folderId: string | undefined, documentID: number) {
  return `${token}\n${slug}\n${folderId ?? ""}\n${documentID}`
}

export function getCachedPreviewAuth(
  token: string,
  slug: string,
  folderId: string | undefined,
  documentID: number,
): string | null {
  const k = cacheKey(token, slug, folderId, documentID)
  const e = store.get(k)
  const now = Date.now()
  if (!e || e.expiresAt <= now) {
    if (e) store.delete(k)
    return null
  }
  return e.dataroomID
}

export function setCachedPreviewAuth(
  token: string,
  slug: string,
  folderId: string | undefined,
  documentID: number,
  dataroomID: string,
) {
  const k = cacheKey(token, slug, folderId, documentID)
  store.set(k, { dataroomID, expiresAt: Date.now() + TTL_MS })

  if (store.size <= MAX_ENTRIES) return
  for (const [key, entry] of store) {
    if (entry.expiresAt <= Date.now()) store.delete(key)
  }
}
