import type { AIModel } from "@/lib/link-iq-types"

export function normalizeModelLabel(label: string) {
  return label.trim().toLocaleLowerCase()
}

export function findDuplicateModelLabel(
  models: AIModel[],
  providerID: string,
  label: string,
  excludeModelID?: string
) {
  const normalizedLabel = normalizeModelLabel(label)
  if (!providerID || !normalizedLabel) return null

  return (
    models.find((model) => {
      if (model.provider_id !== providerID) return false
      if (excludeModelID && model.model_id === excludeModelID) return false
      return normalizeModelLabel(model.label) === normalizedLabel
    }) ?? null
  )
}

export function allowsExistingDuplicateLabel(
  persistedModel: AIModel | null | undefined,
  draftLabel: string
) {
  if (!persistedModel?.model_id) return false
  return normalizeModelLabel(persistedModel.label) === normalizeModelLabel(draftLabel)
}
