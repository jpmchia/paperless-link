import { describe, expect, it } from "vitest"
import {
  mapTaskNameFilterToTaskType,
  normalizePaperlessTask,
  normalizePaperlessTasksPayload,
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
    })
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

  it("maps task_name filters to task_type for API v10", () => {
    const params = mapTaskNameFilterToTaskType(
      new URLSearchParams("task_name=train_classifier"),
      10
    )
    expect(params.get("task_type")).toBe("train_classifier")
    expect(params.has("task_name")).toBe(false)
  })
})
