/**
 * Normalize Paperless-NGX task payloads across API v9 and v10 into a stable
 * client shape used by Link's tasks UI.
 */

export type NormalizedPaperlessTask = {
  acknowledged: boolean
  date_created: string
  date_done?: string
  id: number
  related_document?: number | null
  result?: string
  status: string
  task_file_name: string
  task_id: string
  task_name?: string
  task_type?: string
  type: string
}

const STATUS_TO_UPPER: Record<string, string> = {
  pending: "PENDING",
  started: "STARTED",
  success: "SUCCESS",
  failure: "FAILURE",
  revoked: "REVOKED",
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function deriveResult(raw: Record<string, unknown>): string | undefined {
  if (typeof raw.result === "string") return raw.result
  const resultData = asRecord(raw.result_data)
  if (!resultData) return undefined
  if (typeof resultData.error_message === "string") return resultData.error_message
  if (typeof resultData.reason === "string") return resultData.reason
  if (resultData.document_id != null) return `Document ${String(resultData.document_id)}`
  if (resultData.duplicate_of != null) {
    return `Duplicate of ${String(resultData.duplicate_of)}`
  }
  return undefined
}

function deriveRelatedDocument(raw: Record<string, unknown>): number | null {
  if (typeof raw.related_document === "number") return raw.related_document
  if (Array.isArray(raw.related_document_ids) && raw.related_document_ids.length > 0) {
    const first = raw.related_document_ids[0]
    return typeof first === "number" ? first : null
  }
  return null
}

function deriveFileName(raw: Record<string, unknown>): string {
  if (typeof raw.task_file_name === "string") return raw.task_file_name
  const inputData = asRecord(raw.input_data)
  if (inputData && typeof inputData.filename === "string") return inputData.filename
  return ""
}

function deriveTaskName(raw: Record<string, unknown>): string | undefined {
  if (typeof raw.task_name === "string") return raw.task_name
  if (typeof raw.task_type === "string") return raw.task_type
  return undefined
}

function deriveType(raw: Record<string, unknown>): string {
  if (typeof raw.type === "string") return raw.type
  if (typeof raw.trigger_source === "string") return raw.trigger_source
  return "manual_task"
}

function normalizeStatus(status: unknown): string {
  if (typeof status !== "string") return "PENDING"
  return STATUS_TO_UPPER[status.toLowerCase()] ?? status.toUpperCase()
}

export function normalizePaperlessTask(raw: unknown): NormalizedPaperlessTask | null {
  const record = asRecord(raw)
  if (!record || typeof record.id !== "number") return null

  return {
    acknowledged: Boolean(record.acknowledged),
    date_created:
      typeof record.date_created === "string" ? record.date_created : "",
    date_done: typeof record.date_done === "string" ? record.date_done : undefined,
    id: record.id,
    related_document: deriveRelatedDocument(record),
    result: deriveResult(record),
    status: normalizeStatus(record.status),
    task_file_name: deriveFileName(record),
    task_id: typeof record.task_id === "string" ? record.task_id : String(record.id),
    task_name: deriveTaskName(record),
    task_type: typeof record.task_type === "string" ? record.task_type : undefined,
    type: deriveType(record),
  }
}

export function normalizePaperlessTasksPayload(data: unknown): NormalizedPaperlessTask[] {
  if (Array.isArray(data)) {
    return data
      .map((item) => normalizePaperlessTask(item))
      .filter((item): item is NormalizedPaperlessTask => item != null)
  }

  const record = asRecord(data)
  if (record && Array.isArray(record.results)) {
    return record.results
      .map((item) => normalizePaperlessTask(item))
      .filter((item): item is NormalizedPaperlessTask => item != null)
  }

  return []
}

/** Map legacy task_name query params to v10 task_type. */
export function mapTaskNameFilterToTaskType(
  params: URLSearchParams,
  apiVersion: 9 | 10
): URLSearchParams {
  const next = new URLSearchParams(params)
  if (apiVersion >= 10) {
    if (!next.has("task_type") && next.has("task_name")) {
      next.set("task_type", next.get("task_name")!)
    }
    next.delete("task_name")
    if (!next.has("task_type")) {
      next.set("task_type", "consume_file")
    }
  } else if (!next.has("task_name")) {
    next.set("task_name", "consume_file")
  }
  return next
}
