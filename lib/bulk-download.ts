import {
  getDocumentSelectionExcludedIds,
  serializeDocumentSelection,
  type DocumentSelection,
  type SerializedDocumentSelection,
} from "@/lib/document-selection"

export type BulkDownloadContent = "archive" | "originals" | "both"

export type BulkDownloadCheckboxState = {
  archive: boolean
  originals: boolean
}

export type BulkDownloadPayload = SerializedDocumentSelection & {
  excluded_document_ids?: number[]
  content: BulkDownloadContent
  follow_formatting: boolean
}

const BULK_DOWNLOAD_FALLBACK_FILENAME = "documents.zip"

export function deriveBulkDownloadContent({
  archive,
  originals,
}: BulkDownloadCheckboxState): BulkDownloadContent | null {
  if (archive && originals) {
    return "both"
  }

  if (archive) {
    return "archive"
  }

  if (originals) {
    return "originals"
  }

  return null
}

export function isBulkDownloadContent(value: unknown): value is BulkDownloadContent {
  return value === "archive" || value === "originals" || value === "both"
}

export function buildBulkDownloadPayload(
  selection: DocumentSelection,
  options: BulkDownloadCheckboxState & {
    followFormatting: boolean
  }
): BulkDownloadPayload {
  const content = deriveBulkDownloadContent(options)

  if (!content) {
    throw new Error("Select at least one file type to download.")
  }

  const excludedDocumentIds = getDocumentSelectionExcludedIds(selection)

  return {
    ...serializeDocumentSelection(selection),
    ...(excludedDocumentIds.length > 0
      ? { excluded_document_ids: excludedDocumentIds }
      : {}),
    content,
    follow_formatting: options.followFormatting,
  }
}

export function getBulkDownloadFilename(
  contentDisposition: string | null,
  fallback = BULK_DOWNLOAD_FALLBACK_FILENAME
) {
  if (!contentDisposition) {
    return fallback
  }

  const encodedMatch = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1].trim())
    } catch {
      return encodedMatch[1].trim()
    }
  }

  const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i)
  if (quotedMatch?.[1]) {
    return quotedMatch[1].trim()
  }

  const bareMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i)
  if (bareMatch?.[1]) {
    return bareMatch[1].trim()
  }

  return fallback
}

export async function downloadBulkDocuments(
  payload: BulkDownloadPayload,
  fallbackFilename = BULK_DOWNLOAD_FALLBACK_FILENAME
) {
  const response = await fetch("/api/bulk-download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error((await response.text().catch(() => response.statusText)) || "Download failed")
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = getBulkDownloadFilename(
    response.headers.get("Content-Disposition"),
    fallbackFilename
  )
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}
