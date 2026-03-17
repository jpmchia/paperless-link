export type RealtimeConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"
  | "unsupported"

export type RealtimeEvent =
  | {
      kind: "connection-status"
      status: RealtimeConnectionStatus
    }
  | {
      currentProgress?: number
      documentId?: number
      filename?: string
      kind: "document-detected" | "document-consumed" | "document-failed"
      maxProgress?: number
      message?: string
      status?: string
      taskId?: string
    }
  | {
      documentId: number
      kind: "document-updated" | "document-deleted"
      modified?: string
    }
  | {
      currentProgress?: number
      documentId?: number
      filename?: string
      kind: "task-progress"
      maxProgress?: number
      message?: string
      status?: string
      taskId?: string
    }
  | {
      documentIds: number[]
      kind: "documents-deleted"
    }
  | {
      kind: "raw"
      payload: unknown
    }

function toProgressFields(record: Record<string, unknown>) {
  return {
    currentProgress:
      typeof record.current_progress === "number"
        ? record.current_progress
        : undefined,
    documentId:
      typeof record.document_id === "number" ? record.document_id : undefined,
    filename: typeof record.filename === "string" ? record.filename : undefined,
    maxProgress:
      typeof record.max_progress === "number" ? record.max_progress : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
    status: typeof record.status === "string" ? record.status : undefined,
    taskId: typeof record.task_id === "string" ? record.task_id : undefined,
  }
}

export function normalizeRealtimeEvent(payload: unknown): RealtimeEvent | null {
  if (!payload || typeof payload !== "object") {
    return { kind: "raw", payload }
  }

  const record = payload as Record<string, unknown>
  const eventType = String(record.event ?? record.type ?? "")
  const nestedData =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : null

  if (nestedData && eventType === "status_update") {
    const progressFields = toProgressFields(nestedData)

    switch (progressFields.status) {
      case "STARTED":
        return { kind: "document-detected", ...progressFields }
      case "SUCCESS":
        return { kind: "document-consumed", ...progressFields }
      case "FAILED":
        return { kind: "document-failed", ...progressFields }
      default:
        return { kind: "task-progress", ...progressFields }
    }
  }

  if (nestedData && eventType === "document_updated") {
    if (typeof nestedData.document_id === "number") {
      return {
        documentId: nestedData.document_id,
        kind: "document-updated",
        modified:
          typeof nestedData.modified === "string" ? nestedData.modified : undefined,
      }
    }
  }

  if (nestedData && eventType === "documents_deleted") {
    const documentIds = Array.isArray(nestedData.documents)
      ? nestedData.documents.filter(
          (documentId): documentId is number => typeof documentId === "number"
        )
      : []

    if (documentIds.length === 1) {
      return { documentId: documentIds[0], kind: "document-deleted" }
    }

    if (documentIds.length > 1) {
      return { documentIds, kind: "documents-deleted" }
    }
  }

  if (eventType.includes("document_consumption_finished")) {
    return {
      kind: "document-consumed",
      documentId:
        typeof record.document_id === "number" ? record.document_id : undefined,
      filename: typeof record.filename === "string" ? record.filename : undefined,
    }
  }

  if (eventType.includes("document_consumption_failed")) {
    return {
      kind: "document-failed",
      filename: typeof record.filename === "string" ? record.filename : undefined,
      message: typeof record.message === "string" ? record.message : undefined,
    }
  }

  if (eventType.includes("document_detected")) {
    return {
      kind: "document-detected",
      filename: typeof record.filename === "string" ? record.filename : undefined,
    }
  }

  if (typeof record.document_id === "number") {
    if (eventType.includes("updated")) {
      return {
        kind: "document-updated",
        documentId: record.document_id,
        modified:
          typeof record.modified === "string" ? record.modified : undefined,
      }
    }
    if (eventType.includes("deleted")) {
      return { kind: "document-deleted", documentId: record.document_id }
    }
  }

  return { kind: "raw", payload }
}
