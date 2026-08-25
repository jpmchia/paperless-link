import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TasksView } from "@/app/tasks/tasks-view"
import { JotaiProvider } from "@/components/jotai-provider"
import { PermissionsProvider } from "@/components/permissions/provider"

const getJsonMock = vi.fn()
const postJsonMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock("@/lib/paperless-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/paperless-client")>(
    "@/lib/paperless-client"
  )
  return {
    ...actual,
    getJson: (...args: unknown[]) => getJsonMock(...args),
    postJson: (...args: unknown[]) => postJsonMock(...args),
  }
})

function mockTaskApis(tasks: Array<Record<string, unknown>>) {
  getJsonMock.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes("/api/tasks/status-counts")) {
      return Promise.resolve({
        pending: tasks.filter((t) => t.status === "PENDING").length,
        started: tasks.filter((t) => t.status === "STARTED").length,
        success: tasks.filter((t) => t.status === "SUCCESS").length,
        failure: tasks.filter((t) => t.status === "FAILURE").length,
        revoked: 0,
        total: tasks.length,
      })
    }
    if (url.includes("/api/tasks/summary")) {
      return Promise.resolve([])
    }
    if (url.includes("/api/tasks")) {
      const params = new URL(url, "http://local").searchParams
      const status = (params.get("status") ?? "failure").toUpperCase()
      const filtered = tasks.filter((task) => {
        if (status === "FAILURE") {
          return task.status === "FAILURE" || task.status === "REVOKED"
        }
        return task.status === status
      })
      return Promise.resolve({
        count: filtered.length,
        next: null,
        previous: null,
        results: filtered,
      })
    }
    return Promise.resolve({ count: 0, results: [] })
  })
}

function renderTasksView(permissionCodes: string[]) {
  return render(
    <JotaiProvider>
      <PermissionsProvider
        initialPermissions={{
          groupIds: [],
          isAuthenticated: true,
          isStaff: false,
          isSuperuser: false,
          permissionCodes,
          userId: 1,
        }}
      >
        <TasksView />
      </PermissionsProvider>
    </JotaiProvider>
  )
}

describe("TasksView refinements", () => {
  beforeEach(() => {
    getJsonMock.mockReset()
    postJsonMock.mockReset()
  })

  it("separates tasks by tab and supports filtering", async () => {
    mockTaskApis([
      {
        acknowledged: false,
        date_created: "2025-01-04T00:00:00Z",
        id: 1,
        result: "Import finished",
        status: "SUCCESS",
        task_file_name: "alpha.pdf",
        task_id: "task-1",
        type: "consume",
      },
      {
        acknowledged: false,
        date_created: "2025-01-03T00:00:00Z",
        id: 2,
        result: "OCR failed",
        status: "FAILURE",
        task_file_name: "beta.pdf",
        task_id: "task-2",
        type: "consume",
      },
      {
        acknowledged: false,
        date_created: "2025-01-02T00:00:00Z",
        id: 3,
        status: "PENDING",
        task_file_name: "gamma.pdf",
        task_id: "task-3",
        type: "consume",
      },
    ])

    renderTasksView(["view_paperlesstask", "change_paperlesstask"])

    expect(await screen.findByText("beta.pdf")).toBeInTheDocument()
    expect(screen.queryByText("alpha.pdf")).not.toBeInTheDocument()

    fireEvent.mouseDown(screen.getByRole("tab", { name: /Completed/i }))
    fireEvent.click(screen.getByRole("tab", { name: /Completed/i }))

    await waitFor(() => {
      expect(screen.getByText("alpha.pdf")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText("Filter by name..."), {
      target: { value: "alpha" },
    })

    expect(screen.getByText("alpha.pdf")).toBeInTheDocument()
  })

  it("dismisses only the selected tasks", async () => {
    mockTaskApis([
      {
        acknowledged: false,
        date_created: "2025-01-03T00:00:00Z",
        id: 10,
        result: "OCR failed",
        status: "FAILURE",
        task_file_name: "beta.pdf",
        task_id: "task-10",
        type: "consume",
      },
      {
        acknowledged: false,
        date_created: "2025-01-02T00:00:00Z",
        id: 11,
        result: "Parser failed",
        status: "FAILURE",
        task_file_name: "gamma.pdf",
        task_id: "task-11",
        type: "consume",
      },
    ])
    postJsonMock.mockResolvedValue({ result: 1 })

    renderTasksView(["view_paperlesstask", "change_paperlesstask"])

    expect(await screen.findByText("beta.pdf")).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText("Select beta.pdf"))
    fireEvent.click(screen.getByText("Dismiss Selected"))

    await waitFor(() => {
      expect(postJsonMock).toHaveBeenCalledWith("/api/tasks/acknowledge", {
        tasks: [10],
      })
    })
  })
})
