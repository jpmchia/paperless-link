import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CorrespondentsTable } from "@/app/correspondents/correspondents-table"
import { StoragePathsTable } from "@/app/storage-paths/storage-paths-table"
import { TagsTable } from "@/app/tags/tags-table"
import { JotaiProvider } from "@/components/jotai-provider"
import { PermissionsProvider } from "@/components/permissions/provider"

const createTagMock = vi.fn()
const updateTagMock = vi.fn()
const deleteTagMock = vi.fn()
const createCorrespondentMock = vi.fn()
const updateCorrespondentMock = vi.fn()
const deleteCorrespondentMock = vi.fn()

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock("@/lib/management-actions", () => ({
  createTag: (...args: unknown[]) => createTagMock(...args),
  updateTag: (...args: unknown[]) => updateTagMock(...args),
  deleteTag: (...args: unknown[]) => deleteTagMock(...args),
  createCorrespondent: (...args: unknown[]) => createCorrespondentMock(...args),
  updateCorrespondent: (...args: unknown[]) => updateCorrespondentMock(...args),
  deleteCorrespondent: (...args: unknown[]) => deleteCorrespondentMock(...args),
}))

function renderWithPermissions(ui: React.ReactNode, permissionCodes: string[]) {
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
        {ui}
      </PermissionsProvider>
    </JotaiProvider>
  )
}

describe("Management table refinements", () => {
  beforeEach(() => {
    createTagMock.mockReset()
    updateTagMock.mockReset()
    deleteTagMock.mockReset()
    createCorrespondentMock.mockReset()
    updateCorrespondentMock.mockReset()
    deleteCorrespondentMock.mockReset()
  })

  it("paginates tags after the first 25 rows", async () => {
    const tags = Array.from({ length: 26 }, (_, index) => ({
      color: "#a6cee3",
      id: index + 1,
      is_inbox_tag: false,
      is_insensitive: false,
      match: "",
      matching_algorithm: 6,
      name: `Tag ${String(index + 1).padStart(2, "0")}`,
    }))

    renderWithPermissions(<TagsTable initialTags={tags} />, [
      "view_tag",
      "add_tag",
      "change_tag",
      "delete_tag",
    ])

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument()
    expect(screen.getByText("Tag 01")).toBeInTheDocument()
    expect(screen.queryByText("Tag 26")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("link", { name: "Go to next page" }))

    await waitFor(() => {
      expect(screen.getByText("Page 2 of 2")).toBeInTheDocument()
    })

    expect(screen.getByText("Tag 26")).toBeInTheDocument()
    expect(screen.queryByText("Tag 01")).not.toBeInTheDocument()
  })

  it("bulk deletes the selected tags", async () => {
    deleteTagMock.mockResolvedValue(undefined)

    renderWithPermissions(
      <TagsTable
        initialTags={[
          {
            color: "#a6cee3",
            id: 1,
            is_inbox_tag: false,
            is_insensitive: false,
            match: "",
            matching_algorithm: 6,
            name: "Alpha",
          },
          {
            color: "#1f78b4",
            id: 2,
            is_inbox_tag: false,
            is_insensitive: false,
            match: "",
            matching_algorithm: 6,
            name: "Beta",
          },
        ]}
      />,
      ["view_tag", "add_tag", "change_tag", "delete_tag"]
    )

    fireEvent.click(screen.getByLabelText("Select Alpha"))
    fireEvent.click(screen.getByLabelText("Select Beta"))
    fireEvent.click(screen.getByRole("button", { name: "Delete Selected" }))

    await waitFor(() => {
      expect(deleteTagMock).toHaveBeenCalledTimes(2)
    })

    expect(deleteTagMock).toHaveBeenCalledWith(1)
    expect(deleteTagMock).toHaveBeenCalledWith(2)

    await waitFor(() => {
      expect(screen.queryByText("Alpha")).not.toBeInTheDocument()
      expect(screen.queryByText("Beta")).not.toBeInTheDocument()
    })
  })

  it("bulk deletes selected correspondents", async () => {
    deleteCorrespondentMock.mockResolvedValue(undefined)

    renderWithPermissions(
      <CorrespondentsTable
        initialCorrespondents={[
          {
            id: 11,
            is_insensitive: false,
            match: "",
            matching_algorithm: 6,
            name: "Ampere",
          },
          {
            id: 12,
            is_insensitive: false,
            match: "",
            matching_algorithm: 6,
            name: "Companies House",
          },
        ]}
      />,
      [
        "view_correspondent",
        "add_correspondent",
        "change_correspondent",
        "delete_correspondent",
      ]
    )

    fireEvent.click(screen.getByLabelText("Select Ampere"))
    fireEvent.click(screen.getByLabelText("Select Companies House"))
    fireEvent.click(screen.getByRole("button", { name: "Delete Selected" }))

    await waitFor(() => {
      expect(deleteCorrespondentMock).toHaveBeenCalledTimes(2)
    })

    expect(deleteCorrespondentMock).toHaveBeenCalledWith(11)
    expect(deleteCorrespondentMock).toHaveBeenCalledWith(12)

    await waitFor(() => {
      expect(screen.queryByText("Ampere")).not.toBeInTheDocument()
      expect(screen.queryByText("Companies House")).not.toBeInTheDocument()
    })
  })

  it("opens the requested tag editor when an initial edit id is provided", async () => {
    renderWithPermissions(
      <TagsTable
        initialTags={[
          {
            color: "#a6cee3",
            id: 1,
            is_inbox_tag: false,
            is_insensitive: false,
            match: "",
            matching_algorithm: 6,
            name: "Alpha",
          },
        ]}
        initialEditTagId={1}
      />,
      ["view_tag", "change_tag"]
    )

    expect(await screen.findByDisplayValue("Alpha")).toBeInTheDocument()
  })

  it("opens the requested storage path editor when an initial edit id is provided", async () => {
    renderWithPermissions(
      <StoragePathsTable
        initialItems={[
          {
            id: 7,
            is_insensitive: false,
            match: "",
            matching_algorithm: 6,
            name: "Archive",
            path: "/archive/{created_year}",
          },
        ]}
        initialEditItemId={7}
      />,
      ["view_storagepath", "change_storagepath"]
    )

    expect(await screen.findByDisplayValue("Archive")).toBeInTheDocument()
  })
})
