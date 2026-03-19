type CustomFieldDefinition = {
  id: number
  data_type: string
  extra_data?: {
    select_options?: Array<
      | string
      | {
          id?: string
          label?: string
        }
    >
  }
}

type DocumentFormValues = Record<string, unknown> & {
  title?: string
  created?: string
  archive_serial_number?: number | null
  correspondent?: number | null | ""
  document_type?: number | null | ""
  storage_path?: number | null | ""
  tags?: number[]
}

function normalizeNullableNumber(value: unknown): number | null | undefined {
  if (value === "" || value === null || typeof value === "undefined") {
    return null
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function getSelectOptionId(option: string | { id?: string; label?: string }): string {
  if (typeof option === "string") {
    return option
  }

  if (typeof option.id !== "undefined" && option.id !== null) {
    return String(option.id)
  }

  return option.label ? String(option.label) : ""
}

function getSelectOptionLabel(option: string | { id?: string; label?: string }): string {
  if (typeof option === "string") {
    return option
  }

  if (typeof option.label !== "undefined" && option.label !== null) {
    return String(option.label)
  }

  return typeof option.id !== "undefined" && option.id !== null ? String(option.id) : ""
}

export function normalizeCustomFieldSelectValue(
  field: CustomFieldDefinition,
  rawValue: unknown
): string | number | null {
  // Support both legacy string-option backends and newer id/label option objects.
  if (rawValue === "" || rawValue === null || typeof rawValue === "undefined") {
    return null
  }

  const normalized = String(rawValue)
  const selectOptions = field.extra_data?.select_options ?? []
  const usesLegacyStringOptions = selectOptions.some((option) => typeof option === "string")

  const numericIndex = Number.parseInt(normalized, 10)
  if (
    Number.isFinite(numericIndex) &&
    String(numericIndex) === normalized &&
    numericIndex >= 0 &&
    numericIndex < selectOptions.length
  ) {
    return usesLegacyStringOptions
      ? numericIndex
      : getSelectOptionId(selectOptions[numericIndex])
  }

  if (usesLegacyStringOptions) {
    const labelIndex = selectOptions.findIndex(
      (option) => getSelectOptionLabel(option) === normalized
    )
    return labelIndex >= 0 ? labelIndex : null
  }

  const exactIdMatch = selectOptions.find((option) => getSelectOptionId(option) === normalized)
  if (exactIdMatch) {
    return getSelectOptionId(exactIdMatch)
  }

  const labelMatch = selectOptions.find((option) => getSelectOptionLabel(option) === normalized)
  if (labelMatch) {
    return getSelectOptionId(labelMatch)
  }

  return null
}

export function normalizeCustomFieldValue(
  field: CustomFieldDefinition,
  rawValue: unknown
): unknown {
  switch (field.data_type) {
    case "integer": {
      if (rawValue === "" || rawValue === null || typeof rawValue === "undefined") {
        return null
      }

      const parsed = Number.parseInt(String(rawValue), 10)
      return Number.isNaN(parsed) ? null : parsed
    }

    case "float": {
      if (rawValue === "" || rawValue === null || typeof rawValue === "undefined") {
        return null
      }

      const parsed = Number.parseFloat(String(rawValue))
      return Number.isNaN(parsed) ? null : parsed
    }

    case "documentlink": {
      if (rawValue === "" || rawValue === null || typeof rawValue === "undefined") {
        return null
      }

      if (Array.isArray(rawValue)) {
        const ids = rawValue
          .map((value) => Number.parseInt(String(value), 10))
          .filter((value) => !Number.isNaN(value))

        return ids.length > 0 ? ids : null
      }

      if (typeof rawValue === "string") {
        const ids = rawValue
          .split(",")
          .map((value) => Number.parseInt(value.trim(), 10))
          .filter((value) => !Number.isNaN(value))

        return ids.length > 0 ? ids : null
      }

      return null
    }

    case "boolean":
      return rawValue === true

    case "select": {
      return normalizeCustomFieldSelectValue(field, rawValue)
    }

    case "date":
    case "long_text":
    case "monetary":
    case "string":
    case "url":
    default:
      if (rawValue === "" || rawValue === null || typeof rawValue === "undefined") {
        return null
      }

      return rawValue
  }
}

export function buildUpdateDocumentPayload(
  values: DocumentFormValues,
  customFieldsList: CustomFieldDefinition[],
  visibleCustomFields: number[]
) {
  const payload: Record<string, unknown> = {
    title: values.title,
    correspondent: normalizeNullableNumber(values.correspondent),
    document_type: normalizeNullableNumber(values.document_type),
    storage_path: normalizeNullableNumber(values.storage_path),
    tags: values.tags ?? [],
    custom_fields: customFieldsList
      .filter((cf) => visibleCustomFields.includes(cf.id))
      .map((cf) => ({
        field: cf.id,
        value: normalizeCustomFieldValue(cf, values[`cf_${cf.id}`]),
      })),
  }

  if (values.created) {
    payload.created = values.created
  }

  const archiveSerialNumber = normalizeNullableNumber(values.archive_serial_number)
  payload.archive_serial_number = archiveSerialNumber === undefined ? null : archiveSerialNumber

  return payload
}
