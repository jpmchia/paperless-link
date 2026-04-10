"use client"

export function getDataroomSessionToken(): string {
  if (typeof window === "undefined") return ""
  try {
    return window.sessionStorage.getItem("dataroom_session")?.trim() || ""
  } catch {
    return ""
  }
}

export function dataroomPublicDocumentApiUrl(
  slug: string,
  documentId: number,
  segment: "preview" | "download",
): string {
  const token = getDataroomSessionToken()
  const params = new URLSearchParams({ token, slug })
  return `/api/link-iq/dataroom-public/documents/${documentId}/${segment}?${params.toString()}`
}

export async function downloadDataroomDocuments(slug: string, documentIds: number[]): Promise<void> {
  if (documentIds.length === 0) return
  const token = getDataroomSessionToken()
  if (!token) throw new Error("No dataroom session")

  for (const id of documentIds) {
    const url = dataroomPublicDocumentApiUrl(slug, id, "download")
    const res = await fetch(url, { credentials: "same-origin" })
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText)
      throw new Error(err || `Download failed for document ${id}`)
    }
    const blob = await res.blob()
    const dispo = res.headers.get("Content-Disposition")
    let filename = `document-${id}.pdf`
    const match = dispo?.match(/filename="?([^";]+)"?/i)
    if (match?.[1]) filename = match[1].trim()

    const href = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = href
    a.download = filename
    a.click()
    URL.revokeObjectURL(href)
    await new Promise((r) => setTimeout(r, 200))
  }
}

export function printDataroomDocuments(slug: string, documentIds: number[]): void {
  if (documentIds.length === 0) return
  const token = getDataroomSessionToken()
  if (!token) return

  documentIds.forEach((id, index) => {
    const previewUrl = dataroomPublicDocumentApiUrl(slug, id, "preview")
    window.setTimeout(() => {
      window.open(previewUrl, "_blank", "noopener,noreferrer")
    }, index * 400)
  })
}
