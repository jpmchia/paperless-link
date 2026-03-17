import { describe, expect, it } from "vitest"
import { countPendingTasks } from "@/lib/stores/tasks"

describe("task shell store helpers", () => {
  it("counts only unacknowledged pending and started tasks", () => {
    expect(
      countPendingTasks([
        { acknowledged: false, status: "PENDING" },
        { acknowledged: false, status: "STARTED" },
        { acknowledged: false, status: "SUCCESS" },
        { acknowledged: true, status: "PENDING" },
      ])
    ).toBe(2)
  })

  it("returns zero when no shell-pending tasks remain", () => {
    expect(
      countPendingTasks([
        { acknowledged: true, status: "STARTED" },
        { acknowledged: false, status: "FAILURE" },
      ])
    ).toBe(0)
  })
})
