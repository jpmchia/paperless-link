import { describe, expect, it } from "vitest"
import { normalizeRealtimeEvent } from "@/lib/realtime/events"

describe("normalizeRealtimeEvent – extended coverage", () => {
  describe("status_update events", () => {
    it("maps STARTED status to document-detected", () => {
      expect(
        normalizeRealtimeEvent({
          event: "status_update",
          data: {
            document_id: 5,
            filename: "scan.pdf",
            status: "STARTED",
            task_id: "t-1",
          },
        })
      ).toEqual({
        kind: "document-detected",
        documentId: 5,
        filename: "scan.pdf",
        status: "STARTED",
        taskId: "t-1",
      })
    })

    it("maps FAILED status to document-failed", () => {
      expect(
        normalizeRealtimeEvent({
          event: "status_update",
          data: {
            filename: "corrupt.pdf",
            message: "OCR failed",
            status: "FAILED",
            task_id: "t-2",
          },
        })
      ).toEqual({
        kind: "document-failed",
        filename: "corrupt.pdf",
        message: "OCR failed",
        status: "FAILED",
        taskId: "t-2",
      })
    })

    it("handles missing optional progress fields", () => {
      const result = normalizeRealtimeEvent({
        event: "status_update",
        data: { status: "WORKING" },
      })
      expect(result).toEqual({
        kind: "task-progress",
        status: "WORKING",
      })
    })
  })

  describe("document_updated events", () => {
    it("normalizes document_updated with modified timestamp", () => {
      expect(
        normalizeRealtimeEvent({
          type: "document_updated",
          data: {
            document_id: 42,
            modified: "2024-06-15T12:00:00Z",
          },
        })
      ).toEqual({
        kind: "document-updated",
        documentId: 42,
        modified: "2024-06-15T12:00:00Z",
      })
    })

    it("returns null-like for document_updated without document_id", () => {
      const result = normalizeRealtimeEvent({
        type: "document_updated",
        data: { modified: "2024-01-01" },
      })
      // Falls through to raw since there's no document_id
      expect(result?.kind).toBe("raw")
    })
  })

  describe("documents_deleted events", () => {
    it("handles single document deletion", () => {
      expect(
        normalizeRealtimeEvent({
          type: "documents_deleted",
          data: { documents: [99] },
        })
      ).toEqual({
        kind: "document-deleted",
        documentId: 99,
      })
    })

    it("handles empty documents array as raw", () => {
      const result = normalizeRealtimeEvent({
        type: "documents_deleted",
        data: { documents: [] },
      })
      expect(result?.kind).toBe("raw")
    })

    it("filters out non-number document IDs", () => {
      expect(
        normalizeRealtimeEvent({
          type: "documents_deleted",
          data: { documents: [1, "invalid", 2] },
        })
      ).toEqual({
        kind: "documents-deleted",
        documentIds: [1, 2],
      })
    })
  })

  describe("flat event types (legacy format)", () => {
    it("handles document_consumption_finished", () => {
      expect(
        normalizeRealtimeEvent({
          type: "document_consumption_finished",
          document_id: 77,
          filename: "receipt.pdf",
        })
      ).toEqual({
        kind: "document-consumed",
        documentId: 77,
        filename: "receipt.pdf",
      })
    })

    it("handles document_consumption_failed", () => {
      expect(
        normalizeRealtimeEvent({
          type: "document_consumption_failed",
          filename: "bad.pdf",
          message: "Unsupported format",
        })
      ).toEqual({
        kind: "document-failed",
        filename: "bad.pdf",
        message: "Unsupported format",
      })
    })

    it("handles document_detected", () => {
      expect(
        normalizeRealtimeEvent({
          type: "document_detected",
          filename: "new-doc.pdf",
        })
      ).toEqual({
        kind: "document-detected",
        filename: "new-doc.pdf",
      })
    })

    it("handles flat updated event with document_id", () => {
      expect(
        normalizeRealtimeEvent({
          type: "updated",
          document_id: 10,
          modified: "2024-06-01",
        })
      ).toEqual({
        kind: "document-updated",
        documentId: 10,
        modified: "2024-06-01",
      })
    })

    it("handles flat deleted event with document_id", () => {
      expect(
        normalizeRealtimeEvent({
          type: "deleted",
          document_id: 15,
        })
      ).toEqual({
        kind: "document-deleted",
        documentId: 15,
      })
    })
  })

  describe("edge cases", () => {
    it("returns raw event for null input", () => {
      expect(normalizeRealtimeEvent(null)).toEqual({
        kind: "raw",
        payload: null,
      })
    })

    it("returns raw event for non-object input", () => {
      expect(normalizeRealtimeEvent("hello")).toEqual({
        kind: "raw",
        payload: "hello",
      })
    })

    it("returns raw event for unknown event type", () => {
      expect(
        normalizeRealtimeEvent({ type: "unknown_event", data: {} })
      ).toEqual({
        kind: "raw",
        payload: { type: "unknown_event", data: {} },
      })
    })

    it("uses 'event' field when 'type' is not present", () => {
      expect(
        normalizeRealtimeEvent({
          event: "status_update",
          data: { status: "SUCCESS", document_id: 1, task_id: "t" },
        })
      ).toEqual(
        expect.objectContaining({ kind: "document-consumed" })
      )
    })
  })
})
