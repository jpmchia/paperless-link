import { describe, expect, it } from "vitest"
import {
  mapTaskNameFilterToTaskType,
  normalizePaperlessTask,
  normalizePaperlessTaskPage,
  normalizePaperlessTasksPayload,
  normalizeTaskProgress,
  normalizeTaskStatusCounts,
  normalizeTaskSummary,
} from "@/lib/paperless-tasks"

describe("paperless task normalization", () => {
  it("normalizes v10 task payloads into the Link UI shape", () => {
    const normalized = normalizePaperlessTask({
      id: 7,
      task_id: "abc",
      task_type: "consume_file",
      trigger_source: "folder_consume",
      status: "pending",
      date_created: "2026-01-01T00:00:00Z",
      acknowledged: false,
      input_data: { filename: "invoice.pdf" },
      result_data: { document_id: 42 },
      related_document_ids: [42],
      current_progress: 2,
      max_progress: 4,
    })

    expect(normalized).toEqual({
      id: 7,
      task_id: "abc",
      task_name: "consume_file",
      task_type: "consume_file",
      type: "folder_consume",
      status: "PENDING",
      date_created: "2026-01-01T00:00:00Z",
      date_done: undefined,
      acknowledged: false,
      task_file_name: "invoice.pdf",
      result: "Document 42",
      related_document: 42,
      progress: { current: 2, max: 4, percent: 50 },
    })
  })

  it("preserves paginated v10 task page metadata", () => {
    const page = normalizePaperlessTaskPage({
      count: 42,
      next: "http://example/api/tasks/?page=2",
      previous: null,
      results: [
        {
          id: 1,
          task_id: "t1",
          status: "success",
          date_created: "2026-01-01T00:00:00Z",
          acknowledged: true,
          related_document_ids: [],
        },
      ],
    })
    expect(page.count).toBe(42)
    expect(page.next).toContain("page=2")
    expect(page.results).toHaveLength(1)
    expect(page.results[0]?.status).toBe("SUCCESS")
  })

  it("unwraps paginated v10 task lists", () => {
    const tasks = normalizePaperlessTasksPayload({
      count: 1,
      results: [
        {
          id: 1,
          task_id: "t1",
          status: "success",
          date_created: "2026-01-01T00:00:00Z",
          acknowledged: true,
          related_document_ids: [],
        },
      ],
    })
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.status).toBe("SUCCESS")
  })

  it("maps task_name filters to task_type for API v10 without forcing a default", () => {
    const params = mapTaskNameFilterToTaskType(
      new URLSearchParams("task_name=train_classifier"),
      10
    )
    expect(params.get("task_type")).toBe("train_classifier")
    expect(params.has("task_name")).toBe(false)

    const empty = mapTaskNameFilterToTaskType(new URLSearchParams(), 10)
    expect(empty.has("task_type")).toBe(false)
  })

  it("normalizes progress and status counts", () => {
    expect(normalizeTaskProgress({ current: 3, max: 0 })).toEqual({
      current: 3,
      max: 0,
      percent: 0,
    })
    expect(normalizeTaskProgress({ current: 5, max: 4 })).toEqual({
      current: 4,
      max: 4,
      percent: 100,
    })
    expect(
      normalizeTaskStatusCounts({
        pending: 1,
        started: 2,
        success: 3,
        failure: 4,
        revoked: 0,
      })
    ).toEqual({
      pending: 1,
      started: 2,
      success: 3,
      failure: 4,
      revoked: 0,
      total: 10,
    })
    expect(
      normalizeTaskSummary([
        {
          task_type: "consume_file",
          total_count: 2,
          pending_count: 0,
          success_count: 1,
          failure_count: 1,
        },
      ])
    ).toHaveLength(1)
  })
})
