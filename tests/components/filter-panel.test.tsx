import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FilterPanel } from "@/app/documents/filter-panel"
import { JotaiProvider } from "@/components/jotai-provider"
import { PermissionsProvider } from "@/components/permissions/provider"

const pushMock = vi.fn()
const patchSavedViewMock = vi.fn()
const createSavedViewMock = vi.fn()

vi.mock("next/navigation", () => ({
  usePathname: () => "/documents",
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/app/documents/saved-view-actions", () => ({
  patchSavedView: (...args: unknown[]) => patchSavedViewMock(...args),
  createSavedView: (...args: unknown[]) => createSavedViewMock(...args),
}))

function renderFilterPanel(initialFilters: Record<string, unknown>) {
  return render(
    <JotaiProvider>
      <PermissionsProvider
        initialPermissions={{
          groupIds: [],
          isAuthenticated: true,
          isStaff: false,
          isSuperuser: false,
          permissionCodes: [
            "view_savedview",
            "change_savedview",
            "add_savedview",
          ],
          userId: 1,
        }}
      >
        <FilterPanel
          correspondents={[]}
          documentTypes={[]}
          storagePaths={[]}
          tags={[]}
          savedViews={[]}
          totalCount={0}
          activeViewId={7}
          activeViewName="Invoices"
          activeView={{
            id: 7,
            name: "Invoices",
            filter_rules: [],
            sort_field: "created",
            sort_reverse: true,
          }}
          initialFilters={initialFilters}
          currentUserId={1}
        />
      </PermissionsProvider>
    </JotaiProvider>
  )
}

describe("FilterPanel saved-view dirty state", () => {
  beforeEach(() => {
    pushMock.mockReset()
    patchSavedViewMock.mockReset()
    createSavedViewMock.mockReset()
  })

  it("shows a modified badge and enables save when the current filters differ from the active view", () => {
    renderFilterPanel({ query: "invoice" })

    expect(screen.getByText("Modified")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Save View/i })).toBeEnabled()
  })

  it("keeps save disabled when the current filters still match the active view", () => {
    renderFilterPanel({})

    expect(screen.queryByText("Modified")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Save View/i })).toBeDisabled()
  })

  it("updates the local baseline after saving so the view is no longer dirty", async () => {
    patchSavedViewMock.mockResolvedValue({ id: 7 })

    renderFilterPanel({ query: "invoice" })

    fireEvent.click(screen.getByRole("button", { name: /Save View/i }))

    await waitFor(() => {
      expect(patchSavedViewMock).toHaveBeenCalledWith(7, {
        filter_rules: [{ rule_type: 20, value: "invoice" }],
        sort_field: "created",
        sort_reverse: true,
      })
    })

    await waitFor(() => {
      expect(screen.queryByText("Modified")).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Save View/i })).toBeDisabled()
    })
  })

  it("shows a direct save-view action on the plain document list", () => {
    render(
      <JotaiProvider>
        <PermissionsProvider
          initialPermissions={{
            groupIds: [],
            isAuthenticated: true,
            isStaff: false,
            isSuperuser: false,
            permissionCodes: ["view_savedview", "add_savedview"],
            userId: 1,
          }}
        >
          <FilterPanel
            correspondents={[]}
            documentTypes={[]}
            storagePaths={[]}
            tags={[]}
            savedViews={[]}
            totalCount={0}
            initialFilters={{ query: "invoices" }}
            currentUserId={1}
          />
        </PermissionsProvider>
      </JotaiProvider>
    )

    expect(screen.getByRole("button", { name: "Save View…" })).toBeInTheDocument()
  })

  it("creates a new saved view with the required visibility flags", async () => {
    createSavedViewMock.mockResolvedValue({ id: 12 })

    render(
      <JotaiProvider>
        <PermissionsProvider
          initialPermissions={{
            groupIds: [],
            isAuthenticated: true,
            isStaff: false,
            isSuperuser: false,
            permissionCodes: ["view_savedview", "add_savedview"],
            userId: 1,
          }}
        >
          <FilterPanel
            correspondents={[]}
            documentTypes={[]}
            storagePaths={[]}
            tags={[]}
            savedViews={[]}
            totalCount={0}
            initialFilters={{ query: "invoices" }}
            currentUserId={1}
          />
        </PermissionsProvider>
      </JotaiProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Save View…" }))
    fireEvent.change(screen.getByPlaceholderText("View name"), {
      target: { value: "Invoices" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(createSavedViewMock).toHaveBeenCalledWith({
        name: "Invoices",
        filter_rules: [{ rule_type: 20, value: "invoices" }],
        sort_field: "created",
        sort_reverse: true,
        show_on_dashboard: false,
        show_in_sidebar: false,
      })
    })
  })
})
