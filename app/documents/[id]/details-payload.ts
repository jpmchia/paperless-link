type CustomFieldDefinition = {
  id: number
  data_type: string
  extra_data?: {
    select_options?: Array<{
      id?: string
      label?: string
    }>
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
      if (rawValue === "" || rawValue === null || typeof rawValue === "undefined") {
        return null
      }

      const normalized = String(rawValue)
      const selectOptions = field.extra_data?.select_options ?? []
      const exactIdMatch = selectOptions.find((option) => option?.id === normalized)
      if (exactIdMatch) {
        return normalized
      }

      const labelMatch = selectOptions.find((option) => option?.label === normalized)
      if (labelMatch?.id) {
        return labelMatch.id
      }

      return normalized
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
