import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TrashTable } from "@/app/trash/trash-table"

const fetchMock = vi.fn()
const refreshMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}))

vi.mock("@/hooks/use-permissions", () => ({
  usePermission: () => true,
}))

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}))

describe("TrashTable", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    refreshMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  it("restores documents through the trash endpoint", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
    })

    render(
      <TrashTable
        documents={[
          {
            id: 42,
            title: "Trashed document",
          },
        ]}
      />
    )

    fireEvent.click(screen.getByLabelText("Select all"))
    fireEvent.click(screen.getByText("Restore"))
    fireEvent.click(screen.getByRole("button", { name: "Restore" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/proxy/trash/", {
        body: JSON.stringify({
          action: "restore",
          documents: [42],
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
    })

    expect(refreshMock).toHaveBeenCalled()
  })

  it("permanently deletes documents through the trash endpoint", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
    })

    render(
      <TrashTable
        documents={[
          {
            id: 84,
            title: "Old trashed document",
          },
        ]}
      />
    )

    fireEvent.click(screen.getByLabelText("Select all"))
    fireEvent.click(screen.getByText("Delete Permanently"))
    fireEvent.click(screen.getByRole("button", { name: "Delete Permanently" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/proxy/trash/", {
        body: JSON.stringify({
          action: "empty",
          documents: [84],
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
    })

    expect(refreshMock).toHaveBeenCalled()
  })
})
