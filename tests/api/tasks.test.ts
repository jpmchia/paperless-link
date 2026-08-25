import { beforeEach, describe, expect, it, vi } from "vitest"

const resolveTokenMock = vi.hoisted(() => vi.fn())
const getVersionMock = vi.hoisted(() => vi.fn(() => 10 as 9 | 10))
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/paperless-transport", () => ({
  getPaperlessApiVersion: () => getVersionMock(),
  getPaperlessBaseUrl: () => "http://paperless.test/",
  paperlessJsonAccept: (version = 10) => `application/json; version=${version}`,
  resolvePaperlessAccessToken: () => resolveTokenMock(),
}))

import { GET as getTasks } from "@/app/api/tasks/route"
import { GET as getSummary } from "@/app/api/tasks/summary/route"
import { GET as getStatusCounts } from "@/app/api/tasks/status-counts/route"
import { GET as getActive } from "@/app/api/tasks/active/route"

describe("tasks API routes", () => {
  beforeEach(() => {
    resolveTokenMock.mockReset()
    getVersionMock.mockReset()
    getVersionMock.mockReturnValue(10)
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    resolveTokenMock.mockResolvedValue("token")
  })

  it("returns a normalized paginated task page for v10", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            task_id: "t1",
            status: "pending",
            date_created: "2026-01-01T00:00:00Z",
            acknowledged: false,
            task_type: "consume_file",
            trigger_source: "manual_task",
          },
        ],
      }),
    })

    const response = await getTasks(
      new Request("http://local/api/tasks?page=1&page_size=25")
    )
    const body = await response.json()
    expect(body.count).toBe(1)
    expect(body.results[0].status).toBe("PENDING")
    expect(fetchMock).toHaveBeenCalled()
  })

  it("normalizes summary and status counts", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            task_type: "consume_file",
            total_count: 2,
            pending_count: 0,
            success_count: 1,
            failure_count: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pending: 1,
          started: 2,
          success: 3,
          failure: 4,
          revoked: 0,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 9,
            task_id: "active-1",
            status: "started",
            date_created: "2026-01-01T00:00:00Z",
            acknowledged: false,
          },
        ],
      })

    const summary = await (await getSummary(new Request("http://local/api/tasks/summary"))).json()
    const counts = await (
      await getStatusCounts(new Request("http://local/api/tasks/status-counts"))
    ).json()
    const active = await (await getActive(new Request("http://local/api/tasks/active"))).json()

    expect(summary).toHaveLength(1)
    expect(counts.total).toBe(10)
    expect(active.count).toBe(1)
    expect(active.results[0].status).toBe("STARTED")
  })
})
