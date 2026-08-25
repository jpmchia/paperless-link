import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DocumentsWorkspace } from "@/app/documents/documents-workspace"
import { ConfirmationDialogProvider } from "@/components/confirmation-dialog-provider"
import { JotaiProvider } from "@/components/jotai-provider"

const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
  usePathname: () => "/documents",
  useRouter: () => ({
    push: pushMock,
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams("page=1&page_size=25"),
}))

function renderWorkspace() {
  return render(
    <JotaiProvider>
      <ConfirmationDialogProvider>
        <DocumentsWorkspace
          correspondents={[]}
          currentFilters={{}}
          currentPage={1}
          currentPageSize={25}
          customFields={[]}
          data={[]}
          documentTypes={[]}
          lookup={{
            correspondents: {},
            customFields: {},
            documentTypes: {},
            storagePaths: {},
            tags: {},
            users: {},
          }}
          pageCount={3}
          savedViews={[]}
          storagePaths={[]}
          tags={[]}
          totalCount={0}
          users={[]}
        />
      </ConfirmationDialogProvider>
    </JotaiProvider>
  )
}

describe("DocumentsWorkspace hotkeys", () => {
  it("focuses the search input with /", () => {
    renderWorkspace()

    fireEvent.keyDown(window, { key: "/" })

    expect(screen.getByPlaceholderText("Search documents…")).toHaveFocus()
  })

  it("navigates to the next page with Alt+ArrowRight", () => {
    pushMock.mockReset()
    renderWorkspace()

    fireEvent.keyDown(window, {
      altKey: true,
      key: "ArrowRight",
    })

    expect(pushMock).toHaveBeenCalledWith("?page=2&page_size=25")
  })

  it("ignores the search shortcut while typing in editable elements", () => {
    renderWorkspace()

    const searchInput = screen.getByPlaceholderText("Search documents…")
    searchInput.focus()
    fireEvent.change(searchInput, { target: { value: "invoice" } })
    fireEvent.keyDown(searchInput, { key: "/", code: "Slash" })

    expect(searchInput).toHaveValue("invoice")
    expect(searchInput).toHaveFocus()
  })
})
