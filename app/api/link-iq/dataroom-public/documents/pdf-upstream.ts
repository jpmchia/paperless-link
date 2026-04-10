/**
 * Upstream Paperless calls for dataroom preview/download.
 *
 * **Preview** intentionally matches `app/api/proxy/documents/[id]/preview/route.ts`: do not
 * forward the browser's `Range` to Paperless — fetch the full preview once and stream it back
 * with minimal headers (`Content-Type` only). That avoids 206 / `Content-Range` edge cases
 * with EmbedPDF + Next.js that do not occur on the authenticated document detail page.
 *
 * **Download** may still forward `Range` for resumable downloads (see download route).
 */

export function buildPaperlessPreviewRequestHeaders(paperlessToken: string): Record<string, string> {
  return {
    Authorization: `Token ${paperlessToken}`,
    // Paperless `/preview/` serves the effective file (PDF archive, original image, etc.).
    // `Accept: application/pdf` alone causes DRF 406 for non-PDF originals.
    Accept: "*/*",
  }
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

/** Same minimal outward headers as `/api/proxy/documents/[id]/preview` (document detail). */
export function passthroughPreviewBodyHeaders(upstream: Response): Headers {
  const out = new Headers()
  out.set("Content-Type", upstream.headers.get("Content-Type") || "application/pdf")
  out.set("Cache-Control", "no-store")
  return out
}

/** Headers clients need for ranged PDF / file responses (download / resume). */
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
