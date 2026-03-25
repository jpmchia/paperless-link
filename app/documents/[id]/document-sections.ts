export const DEFAULT_DOCUMENT_SECTION = "details"

export const DOCUMENT_SECTIONS = [
  "details",
  "context",
  "content",
  "metadata",
  "history",
  "permissions",
  "versions",
  "share",
  "duplicates",
] as const

export type DocumentSection = (typeof DOCUMENT_SECTIONS)[number]

export function isDocumentSection(value: string): value is DocumentSection {
  return DOCUMENT_SECTIONS.includes(value as DocumentSection)
}

export function getDocumentSections(options: {
  canChangeDocument: boolean
  canManageShareLinks: boolean
}) {
  return DOCUMENT_SECTIONS.filter((section) => {
    if (section === "permissions") return options.canChangeDocument
    if (section === "share") return options.canManageShareLinks
    return true
  })
}

export function resolveDocumentSection(
  value: string | null | undefined,
  allowedSections: readonly DocumentSection[]
) {
  if (value && isDocumentSection(value) && allowedSections.includes(value)) {
    return value
  }

  return allowedSections[0] ?? DEFAULT_DOCUMENT_SECTION
}

export function getDocumentSectionHref(
  documentId: number | string,
  section: DocumentSection
) {
  if (section === DEFAULT_DOCUMENT_SECTION) {
    return `/documents/${documentId}`
  }

  return `/documents/${documentId}/${section}`
}
