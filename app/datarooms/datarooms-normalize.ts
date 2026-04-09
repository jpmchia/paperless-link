import type { PaperlessUser } from "./datarooms-types"

export function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function normalizeUsersResponse(payload: unknown): PaperlessUser[] {
  if (Array.isArray(payload)) return payload as PaperlessUser[]
  if (!payload || typeof payload !== "object") return []
  const record = payload as Record<string, unknown>
  if (Array.isArray(record.results)) return record.results as PaperlessUser[]
  if (Array.isArray(record.users)) return record.users as PaperlessUser[]
  if (Array.isArray(record.all)) return record.all as PaperlessUser[]
  return []
}

export function normalizePaginatedArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (!payload || typeof payload !== "object") return []
  const record = payload as Record<string, unknown>
  if (Array.isArray(record.results)) return record.results as T[]
  if (Array.isArray(record.nodes)) return record.nodes as T[]
  if (Array.isArray(record.entity_types)) return record.entity_types as T[]
  if (Array.isArray(record.correspondents)) return record.correspondents as T[]
  if (Array.isArray(record.document_types)) return record.document_types as T[]
  if (Array.isArray(record.documentTypes)) return record.documentTypes as T[]
  if (Array.isArray(record.tags)) return record.tags as T[]
  if (Array.isArray(record.custom_fields)) return record.custom_fields as T[]
  if (Array.isArray(record.customFields)) return record.customFields as T[]
  if (Array.isArray(record.all)) return record.all as T[]
  return []
}
