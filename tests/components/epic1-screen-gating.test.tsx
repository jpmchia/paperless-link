import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { JotaiProvider } from "@/components/jotai-provider"
import { PermissionsProvider } from "@/components/permissions/provider"
import { TasksView } from "@/app/tasks/tasks-view"
import { TrashTable } from "@/app/trash/trash-table"
import { UsersTable } from "@/app/users/users-table"
import type { CurrentUserPermissions } from "@/lib/permissions"

const refreshMock = vi.fn()
const getJsonMock = vi.fn()
const postJsonMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: refreshMock,
  }),
}))

vi.mock("@/lib/paperless-client", () => ({
  getJson: (...args: unknown[]) => getJsonMock(...args),
  postJson: (...args: unknown[]) => postJsonMock(...args),
}))

function renderWithPermissions(
  ui: React.ReactNode,
  permissionCodes: string[]
) {
  const permissions: CurrentUserPermissions = {
    groupIds: [],
    isAuthenticated: true,
    isStaff: false,
    isSuperuser: false,
    permissionCodes,
    userId: 1,
  }

  return render(
    <JotaiProvider>
      <PermissionsProvider initialPermissions={permissions}>
        {ui}
      </PermissionsProvider>
    </JotaiProvider>
  )
}

describe("Epic 1 screen gating", () => {
  beforeEach(() => {
    refreshMock.mockReset()
    getJsonMock.mockReset()
    postJsonMock.mockReset()
  })

  it("hides task acknowledgement when change permission is missing", async () => {
    getJsonMock.mockResolvedValue([
      {
        acknowledged: false,
        date_created: "2025-01-01T00:00:00Z",
        id: 1,
        status: "PENDING",
        task_file_name: "doc.pdf",
        task_id: "task-1",
        type: "consume",
      },
    ])

    renderWithPermissions(<TasksView />, ["view_paperlesstask"])

    await screen.findByText("Refresh")
    await waitFor(() => {
      expect(screen.queryByText("Dismiss All")).not.toBeInTheDocument()
    })
  })

  it("shows task acknowledgement when change permission is granted", async () => {
    getJsonMock.mockResolvedValue([
      {
        acknowledged: false,
        date_created: "2025-01-01T00:00:00Z",
        id: 1,
        status: "PENDING",
        task_file_name: "doc.pdf",
        task_id: "task-1",
        type: "consume",
      },
    ])

    renderWithPermissions(<TasksView />, [
      "view_paperlesstask",
      "change_paperlesstask",
    ])

    expect(await screen.findByText("Dismiss All")).toBeInTheDocument()
  })

  it("hides trash selection controls without restore or delete permissions", () => {
    renderWithPermissions(
      <TrashTable
        initialDocuments={[{ id: 1, title: "Trashed doc" }]}
        totalDocuments={1}
      />,
      ["view_document"]
    )

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0)
    expect(screen.queryByText("Restore")).not.toBeInTheDocument()
    expect(screen.queryByText("Delete Permanently")).not.toBeInTheDocument()
  })

  it("shows trash selection controls when document change permission is granted", () => {
    renderWithPermissions(
      <TrashTable
        initialDocuments={[{ id: 1, title: "Trashed doc" }]}
        totalDocuments={1}
      />,
      ["view_document", "change_document"]
    )

    expect(screen.getAllByRole("checkbox")).toHaveLength(2)
  })

  it("hides user and group creation affordances without create permissions", () => {
    renderWithPermissions(
      <UsersTable
        initialGroups={[{ id: 10, name: "admins" }]}
        initialUsers={[{ id: 1, username: "alice", groups: [10] }]}
      />,
      ["view_user", "view_group"]
    )

    expect(screen.queryByText("New User")).not.toBeInTheDocument()
    expect(screen.queryByText("New Group")).not.toBeInTheDocument()
  })

  it("shows user and group creation affordances when create permissions are granted", async () => {
    renderWithPermissions(
      <UsersTable
        initialGroups={[{ id: 10, name: "admins" }]}
        initialUsers={[{ id: 1, username: "alice", groups: [10] }]}
      />,
      ["view_user", "view_group", "add_user", "add_group"]
    )

    expect(screen.getByText("New User")).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Groups \(1\)/ }))
    fireEvent.click(screen.getByRole("tab", { name: /Groups \(1\)/ }))
    await waitFor(() => {
      expect(screen.getByText("New Group")).toBeInTheDocument()
    })
  })
})
