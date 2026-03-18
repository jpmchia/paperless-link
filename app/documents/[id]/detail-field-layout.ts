import type { Document } from "../columns"

export const DETAIL_STANDARD_FIELDS = [
  { id: "title", label: "Title" },
  { id: "created", label: "Created date" },
  { id: "archive_serial_number", label: "ASN" },
  { id: "correspondent", label: "Correspondent" },
  { id: "document_type", label: "Document type" },
  { id: "storage_path", label: "Storage path" },
  { id: "tags", label: "Tags" },
] as const

export const DETAIL_CUSTOM_FIELD_PREFIX = "cf_"
export const DOCUMENT_DETAIL_LAYOUTS_BY_TYPE_KEY = "document_detail_fields_by_type"
export const DOCUMENT_DETAIL_LAYOUTS_STORAGE_KEY = "paperless-document-detail-fields-by-type"

export function getDetailCustomFieldId(customFieldId: number) {
  return `${DETAIL_CUSTOM_FIELD_PREFIX}${customFieldId}`
}

export function parseDetailCustomFieldId(fieldId: string) {
  if (!fieldId.startsWith(DETAIL_CUSTOM_FIELD_PREFIX)) return null

  const parsed = Number(fieldId.slice(DETAIL_CUSTOM_FIELD_PREFIX.length))
  return Number.isFinite(parsed) ? parsed : null
}

export function buildAvailableDetailFields(
  customFieldsList: Array<{ id: number; name: string }>
) {
  return [
    ...DETAIL_STANDARD_FIELDS,
    ...customFieldsList.map((field) => ({
      id: getDetailCustomFieldId(field.id),
      label: field.name,
    })),
  ]
}

export function getDefaultDetailFieldLayout(
  document: Document & { custom_fields?: Array<{ field: number; value?: unknown }> },
  customFieldsList: Array<{ id: number }>
) {
  const standard = DETAIL_STANDARD_FIELDS.map((field) => field.id)
  const populatedCustomFields =
    document.custom_fields
      ?.filter((field) => field.value !== null && field.value !== "" && field.value !== false)
      .map((field) => getDetailCustomFieldId(field.field)) ?? []

  const knownCustomFields = new Set(customFieldsList.map((field) => getDetailCustomFieldId(field.id)))

  return [
    ...standard,
    ...populatedCustomFields.filter((fieldId) => knownCustomFields.has(fieldId)),
  ]
}

export function normalizeDetailFieldLayout(
  layout: string[] | null | undefined,
  availableFieldIds: string[],
  fallbackLayout: string[]
) {
  if (!layout?.length) {
    return fallbackLayout
  }

  const available = new Set(availableFieldIds)
  const normalized = Array.from(new Set(layout.filter((field) => available.has(field))))
  return normalized.length > 0 ? normalized : fallbackLayout
}

export function getDocumentTypeLayoutStorageKey(documentTypeId: number | null | undefined) {
  return documentTypeId ? String(documentTypeId) : "default"
}

export function resolveDetailFieldLayoutForDocumentType(
  layoutsByType: Record<string, string[]> | null | undefined,
  documentTypeId: number | null | undefined,
  availableFieldIds: string[],
  fallbackLayout: string[]
) {
  return normalizeDetailFieldLayout(
    layoutsByType?.[getDocumentTypeLayoutStorageKey(documentTypeId)],
    availableFieldIds,
    fallbackLayout
  )
}

export function areDetailFieldLayoutsEqual(left: string[] | null | undefined, right: string[] | null | undefined) {
  if (left === right) return true
  if (!left || !right) return false
  if (left.length !== right.length) return false

  return left.every((value, index) => value === right[index])
}
