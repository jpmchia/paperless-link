"use client"

export const DOCUMENT_DISPLAY_MODES = [
  "table",
  "smallCards",
  "largeCards",
] as const

export type DocumentDisplayMode = (typeof DOCUMENT_DISPLAY_MODES)[number]

export const DEFAULT_DOCUMENT_DISPLAY_MODE: DocumentDisplayMode = "smallCards"

export function normalizeDocumentDisplayMode(
  value: unknown
): DocumentDisplayMode | null {
  if (typeof value !== "string") return null

  if (value === "details") {
    return "table"
  }

  return DOCUMENT_DISPLAY_MODES.includes(value as DocumentDisplayMode)
    ? (value as DocumentDisplayMode)
    : null
}

export function resolveDocumentDisplayMode(
  savedViewMode: unknown,
  fallbackMode: unknown
): DocumentDisplayMode {
  return (
    normalizeDocumentDisplayMode(savedViewMode) ??
    normalizeDocumentDisplayMode(fallbackMode) ??
    DEFAULT_DOCUMENT_DISPLAY_MODE
  )
}
