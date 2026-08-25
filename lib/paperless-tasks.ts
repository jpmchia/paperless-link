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
  progress?: {
    current: number
    max: number
    percent: number
  }
}

export type NormalizedTaskPage = {
  count: number
  next: string | null
  previous: string | null
  results: NormalizedPaperlessTask[]
}

export type TaskSummaryItem = {
  task_type: string
  total_count: number
  pending_count: number
  success_count: number
  failure_count: number
  avg_duration_seconds?: number | null
  avg_wait_time_seconds?: number | null
  last_run?: string | null
  last_success?: string | null
  last_failure?: string | null
}

export type TaskStatusCounts = {
  pending: number
  started: number
  success: number
  failure: number
  revoked: number
  total: number
}

const STATUS_TO_UPPER: Record<string, string> = {
  pending: "PENDING",
  started: "STARTED",
  working: "STARTED",
  success: "SUCCESS",
  failure: "FAILURE",
  failed: "FAILURE",
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

export function normalizeTaskStatus(status: unknown): string {
  if (typeof status !== "string") return "PENDING"
  return STATUS_TO_UPPER[status.toLowerCase()] ?? status.toUpperCase()
}

export function normalizeTaskProgress(raw: {
  current?: number | null
  max?: number | null
}): { current: number; max: number; percent: number } | undefined {
  const current = typeof raw.current === "number" ? raw.current : null
  const max = typeof raw.max === "number" ? raw.max : null
  if (current == null || max == null) return undefined
  if (max <= 0) {
    return { current: Math.max(0, current), max: 0, percent: 0 }
  }
  const clampedCurrent = Math.max(0, Math.min(current, max))
  return {
    current: clampedCurrent,
    max,
    percent: Math.round((clampedCurrent / max) * 100),
  }
}

function deriveProgress(
  raw: Record<string, unknown>
): NormalizedPaperlessTask["progress"] {
  const fromTopLevel = normalizeTaskProgress({
    current:
      typeof raw.current_progress === "number"
        ? raw.current_progress
        : typeof raw.progress === "number"
          ? raw.progress
          : null,
    max: typeof raw.max_progress === "number" ? raw.max_progress : null,
  })
  if (fromTopLevel) return fromTopLevel

  const resultData = asRecord(raw.result_data)
  if (!resultData) return undefined
  return normalizeTaskProgress({
    current:
      typeof resultData.current_progress === "number"
        ? resultData.current_progress
        : null,
    max:
      typeof resultData.max_progress === "number"
        ? resultData.max_progress
        : null,
  })
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
    status: normalizeTaskStatus(record.status),
    task_file_name: deriveFileName(record),
    task_id: typeof record.task_id === "string" ? record.task_id : String(record.id),
    task_name: deriveTaskName(record),
    task_type: typeof record.task_type === "string" ? record.task_type : undefined,
    type: deriveType(record),
    progress: deriveProgress(record),
  }
}

export function normalizePaperlessTasksPayload(data: unknown): NormalizedPaperlessTask[] {
  return normalizePaperlessTaskPage(data).results
}

export function normalizePaperlessTaskPage(
  data: unknown,
  options?: { page?: number; pageSize?: number }
): NormalizedTaskPage {
  if (Array.isArray(data)) {
    const results = data
      .map((item) => normalizePaperlessTask(item))
      .filter((item): item is NormalizedPaperlessTask => item != null)
    const page = Math.max(1, options?.page ?? 1)
    const pageSize = Math.max(
      1,
      options?.pageSize ?? (results.length > 0 ? results.length : 25)
    )
    const start = (page - 1) * pageSize
    const sliced = results.slice(start, start + pageSize)
    const hasNext = start + pageSize < results.length
    return {
      count: results.length,
      next: hasNext ? `?page=${page + 1}` : null,
      previous: page > 1 ? `?page=${page - 1}` : null,
      results: sliced,
    }
  }

  const record = asRecord(data)
  if (record && Array.isArray(record.results)) {
    const results = record.results
      .map((item) => normalizePaperlessTask(item))
      .filter((item): item is NormalizedPaperlessTask => item != null)
    return {
      count: typeof record.count === "number" ? record.count : results.length,
      next: typeof record.next === "string" ? record.next : null,
      previous: typeof record.previous === "string" ? record.previous : null,
      results,
    }
  }

  return { count: 0, next: null, previous: null, results: [] }
}

export function normalizeTaskSummary(data: unknown): TaskSummaryItem[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((item) => {
    const record = asRecord(item)
    if (!record || typeof record.task_type !== "string") return []
    const summary: TaskSummaryItem = {
      task_type: record.task_type,
      total_count: typeof record.total_count === "number" ? record.total_count : 0,
      pending_count:
        typeof record.pending_count === "number" ? record.pending_count : 0,
      success_count:
        typeof record.success_count === "number" ? record.success_count : 0,
      failure_count:
        typeof record.failure_count === "number" ? record.failure_count : 0,
      avg_duration_seconds:
        typeof record.avg_duration_seconds === "number"
          ? record.avg_duration_seconds
          : null,
      avg_wait_time_seconds:
        typeof record.avg_wait_time_seconds === "number"
          ? record.avg_wait_time_seconds
          : null,
      last_run: typeof record.last_run === "string" ? record.last_run : null,
      last_success:
        typeof record.last_success === "string" ? record.last_success : null,
      last_failure:
        typeof record.last_failure === "string" ? record.last_failure : null,
    }
    return [summary]
  })
}

export function normalizeTaskStatusCounts(data: unknown): TaskStatusCounts {
  const record = asRecord(data)
  const empty: TaskStatusCounts = {
    pending: 0,
    started: 0,
    success: 0,
    failure: 0,
    revoked: 0,
    total: 0,
  }
  if (!record) return empty

  const pending = typeof record.pending === "number" ? record.pending : 0
  const started = typeof record.started === "number" ? record.started : 0
  const success = typeof record.success === "number" ? record.success : 0
  const failure =
    typeof record.failure === "number"
      ? record.failure
      : typeof record.failed === "number"
        ? record.failed
        : 0
  const revoked = typeof record.revoked === "number" ? record.revoked : 0
  const total =
    typeof record.total === "number"
      ? record.total
      : pending + started + success + failure + revoked

  return { pending, started, success, failure, revoked, total }
}

/**
 * Map legacy task_name query params to task_type for API v10.
 * Does not force a default task_type unless the caller already asked for one.
 */
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
  } else if (!next.has("task_name") && next.has("task_type")) {
    next.set("task_name", next.get("task_type")!)
    next.delete("task_type")
  }
  return next
}

export function tabStatusForTaskTab(
  tab: "queued" | "started" | "completed" | "failed"
): string {
  switch (tab) {
    case "queued":
      return "PENDING"
    case "started":
      return "STARTED"
    case "completed":
      return "SUCCESS"
    case "failed":
      return "FAILURE"
    default: {
      const _exhaustive: never = tab
      return _exhaustive
    }
  }
}
