/**
 * Paperless (and pdf.js / EmbedPDF) rely on HTTP Range requests for PDF streaming.
 * Proxies must forward Range / If-Range and pass through 206 + Content-Range or the client hangs.
 */

export function buildPaperlessPreviewRequestHeaders(
  paperlessToken: string,
  incoming: Request,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Token ${paperlessToken}`,
    Accept: "application/pdf",
  }
  const range = incoming.headers.get("Range")
  if (range) headers.Range = range
  const ifRange = incoming.headers.get("If-Range")
  if (ifRange) headers["If-Range"] = ifRange
  return headers
}

export function buildPaperlessDownloadRequestHeaders(
  paperlessToken: string,
  incoming: Request,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Token ${paperlessToken}`,
    Accept: "*/*",
  }
  const range = incoming.headers.get("Range")
  if (range) headers.Range = range
  return headers
}

/** Headers clients need for ranged PDF / file responses */
export function passthroughStreamingHeaders(upstream: Response): Headers {
  const out = new Headers()
  const names = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
  ] as const
  for (const name of names) {
    const v = upstream.headers.get(name)
    if (v) out.set(name, v)
  }
  out.set("Cache-Control", "no-store")
  return out
}
