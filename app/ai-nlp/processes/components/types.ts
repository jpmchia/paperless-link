import type { AIModelRunResult, ContextField } from "@/lib/link-iq-types"

export type PromptFieldDescriptor = {
  id: string
  label: string
  token: string
  description?: string
  sampleValues?: string[]
  acceptableValues?: string[]
  currentValue?: string
  dataType?: string
  source: "business" | "process"
}

export type PromptFieldReferenceDescriptor = {
  reference: string
  label: string
  description?: string
  source: "business" | "process"
}

export type ComparisonSlotState = {
  id: string
  providerID: string
  modelID: string
  running: boolean
  result: AIModelRunResult | null
  error: string
}

export type PromptExampleContext = {
  label: string
  parent_path: string
  path_preview: string
  source_scope: string
  source_id: string
  existing_description: string
  business_context: Record<string, string>
}

export type BusinessContextField = ContextField
