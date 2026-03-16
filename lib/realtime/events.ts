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
      documentId?: number
      filename?: string
      kind: "document-detected" | "document-consumed" | "document-failed"
      message?: string
    }
  | {
      documentId: number
      kind: "document-updated" | "document-deleted"
    }
  | {
      kind: "raw"
      payload: unknown
    }

export function normalizeRealtimeEvent(payload: unknown): RealtimeEvent | null {
  if (!payload || typeof payload !== "object") {
    return { kind: "raw", payload }
  }

  const record = payload as Record<string, unknown>
  const eventType = String(record.event ?? record.type ?? "")

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
      return { kind: "document-updated", documentId: record.document_id }
    }
    if (eventType.includes("deleted")) {
      return { kind: "document-deleted", documentId: record.document_id }
    }
  }

  return { kind: "raw", payload }
}
