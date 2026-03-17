import { describe, expect, it } from "vitest"
import { normalizeRealtimeEvent } from "@/lib/realtime/events"

describe("realtime event normalization", () => {
  it("normalizes nested status update success payloads", () => {
    expect(
      normalizeRealtimeEvent({
        data: {
          document_id: 12,
          filename: "invoice.pdf",
          status: "SUCCESS",
          task_id: "task-12",
        },
        type: "status_update",
      })
    ).toEqual({
      documentId: 12,
      filename: "invoice.pdf",
      kind: "document-consumed",
      status: "SUCCESS",
      taskId: "task-12",
    })
  })

  it("normalizes in-progress task updates", () => {
    expect(
      normalizeRealtimeEvent({
        data: {
          current_progress: 20,
          document_id: 99,
          filename: "batch.pdf",
          max_progress: 100,
          message: "Processing document...",
          status: "WORKING",
          task_id: "task-99",
        },
        type: "status_update",
      })
    ).toEqual({
      currentProgress: 20,
      documentId: 99,
      filename: "batch.pdf",
      kind: "task-progress",
      maxProgress: 100,
      message: "Processing document...",
      status: "WORKING",
      taskId: "task-99",
    })
  })

  it("normalizes deleted document batches", () => {
    expect(
      normalizeRealtimeEvent({
        data: { documents: [1, 2, 3] },
        type: "documents_deleted",
      })
    ).toEqual({
      documentIds: [1, 2, 3],
      kind: "documents-deleted",
    })
  })
})
