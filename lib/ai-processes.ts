import type { AIProcessConfig, ContextField } from "@/lib/link-iq-types"

const UNSAFE_BUSINESS_CONTEXT_INDEX_PATTERN =
  /{{\s*index\s+\.business_context\s+"([^"]+)"\s*}}/g

function resolveBusinessContextValue(field: ContextField) {
  return (
    field.value ||
    field.sample_values?.[0] ||
    field.acceptable_values?.[0] ||
    field.label ||
    ""
  )
}

export function buildBusinessContextValidationMap(fields: ContextField[]) {
  return Object.fromEntries(
    fields
      .filter((field) => field.key)
      .map((field) => [field.key, resolveBusinessContextValue(field)])
  )
}

export function buildBusinessContextToken(key: string) {
  return `{{ with .business_context }}{{ index . "${key}" }}{{ end }}`
}

export function normalizeBusinessContextTemplate(template: string) {
  return template.replace(
    UNSAFE_BUSINESS_CONTEXT_INDEX_PATTERN,
    (_, key: string) => buildBusinessContextToken(key)
  )
}

function normalizeModelID(value?: string) {
  return value?.trim() || ""
}

export function normalizeAIProcessAllocation(
  process: AIProcessConfig
): AIProcessConfig {
  const defaultModelID = normalizeModelID(
    process.default_model_id || process.model_id
  )
  const fallbackModelID = normalizeModelID(process.fallback_model_id)
  const normalizedFallbackModelID =
    fallbackModelID && fallbackModelID !== defaultModelID
      ? fallbackModelID
      : ""
  const availableModelIDs = Array.from(
    new Set(
      (process.available_model_ids ?? [])
        .map((value) => normalizeModelID(value))
        .filter(
          (value) =>
            Boolean(value) &&
            value !== defaultModelID &&
            value !== normalizedFallbackModelID
        )
    )
  )

  return {
    ...process,
    default_model_id: defaultModelID,
    fallback_model_id: normalizedFallbackModelID,
    available_model_ids: availableModelIDs,
    model_id: defaultModelID,
  }
}

export function buildAIProcessUpsertInput(
  process: AIProcessConfig,
  businessContextFields: ContextField[]
) {
  const normalizedProcess = normalizeAIProcessAllocation(process)

  return {
    ...(normalizedProcess as unknown as Record<string, unknown>),
    prompt_template: normalizeBusinessContextTemplate(
      normalizedProcess.prompt_template
    ),
    business_context: buildBusinessContextValidationMap(businessContextFields),
  }
}
