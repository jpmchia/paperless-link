import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FilterPanel } from "@/app/documents/filter-panel"
import { ConfirmationDialogProvider } from "@/components/confirmation-dialog-provider"
import { JotaiProvider } from "@/components/jotai-provider"
import { PermissionsProvider } from "@/components/permissions/provider"
import type { ReactNode } from "react"

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

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onClick,
    className,
    disabled,
  }: {
    children: ReactNode
    onClick?: () => void
    className?: string
    disabled?: boolean
  }) => (
    <button type="button" className={className} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuCheckboxItem: ({
    children,
    checked,
    onCheckedChange,
  }: {
    children: ReactNode
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }) => (
    <button type="button" aria-pressed={checked} onClick={() => onCheckedChange?.(!checked)}>
      {children}
    </button>
  ),
}))

function renderFilterPanel(initialFilters: Record<string, unknown>) {
  return render(
    <JotaiProvider>
      <ConfirmationDialogProvider>
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
            activeViewId={7}
            activeViewName="Invoices"
            activeView={{
              id: 7,
              name: "Invoices",
              filter_rules: [],
              sort_field: "created",
              sort_reverse: true,
              display_fields: ["title", "created"],
              page_size: 25,
            }}
            initialFilters={initialFilters}
            currentUserId={1}
            currentDisplayMode="smallCards"
            currentDisplayFields={["title", "created"]}
            currentPageSize={25}
          />
        </PermissionsProvider>
      </ConfirmationDialogProvider>
    </JotaiProvider>
  )
}

describe("FilterPanel saved-view dirty state", () => {
  beforeEach(() => {
    vi.useRealTimers()
    pushMock.mockReset()
    patchSavedViewMock.mockReset()
    createSavedViewMock.mockReset()
  })

  it("shows a modified badge and enables save when the current filters differ from the active view", () => {
    renderFilterPanel({ query: "invoice" })

    expect(screen.getByText("Modified")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Views/i })).toBeInTheDocument()
  })

  it("keeps the modified badge hidden when the current filters still match the active view", () => {
    renderFilterPanel({})

    expect(screen.queryByText("Modified")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Views/i })).toBeInTheDocument()
  })

  it("shows the views button in a modified state for dirty saved views", () => {
    renderFilterPanel({ query: "invoice" })

    expect(screen.getByRole("button", { name: /Views Modified/i })).toBeInTheDocument()
  })

  it("shows a save-view action in the views menu on the plain document list", () => {
    render(
      <JotaiProvider>
        <ConfirmationDialogProvider>
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
              initialFilters={{ query: "invoices" }}
              currentUserId={1}
            />
          </PermissionsProvider>
        </ConfirmationDialogProvider>
      </JotaiProvider>
    )

    expect(screen.getByRole("button", { name: /Views/i })).toBeInTheDocument()
  })

  it("opens the full saved-view editor from save as new view and creates a view", async () => {
    createSavedViewMock.mockResolvedValue({ id: 11, name: "Invoices board" })

    render(
      <JotaiProvider>
        <ConfirmationDialogProvider>
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
              initialFilters={{ query: "invoices" }}
              currentUserId={1}
              currentDisplayMode="table"
              currentDisplayFields={["title", "created"]}
              currentPageSize={25}
            />
          </PermissionsProvider>
        </ConfirmationDialogProvider>
      </JotaiProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: /Views/i }))
    fireEvent.click(screen.getByText(/Save view/))
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Invoices board" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    await waitFor(() => {
      expect(createSavedViewMock).toHaveBeenCalledWith(expect.objectContaining({
        name: "Invoices board",
        filter_rules: [{ rule_type: 20, value: "invoices" }],
        display_fields: ["title", "created"],
      }))
    })
  })

  it("hides edit and save actions for active saved views without change permission", () => {
    render(
      <JotaiProvider>
        <ConfirmationDialogProvider>
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
              activeViewId={7}
              activeViewName="Invoices"
              activeView={{
                id: 7,
                name: "Invoices",
                filter_rules: [],
                sort_field: "created",
                sort_reverse: true,
                display_fields: ["title", "created"],
                page_size: 25,
              }}
              initialFilters={{ query: "invoice" }}
              currentUserId={1}
              currentDisplayMode="table"
              currentDisplayFields={["title", "created"]}
              currentPageSize={25}
            />
          </PermissionsProvider>
        </ConfirmationDialogProvider>
      </JotaiProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: /Views Modified/i }))

    expect(screen.queryByText("Save view")).not.toBeInTheDocument()
    expect(screen.queryByText("Edit view…")).not.toBeInTheDocument()
    expect(screen.getByText(/Save as new view/)).toBeInTheDocument()
  })

  it("renders the views menu for plain document lists with create permission", () => {
    render(
      <JotaiProvider>
        <ConfirmationDialogProvider>
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
              initialFilters={{ query: "invoices" }}
              currentUserId={1}
            />
          </PermissionsProvider>
        </ConfirmationDialogProvider>
      </JotaiProvider>
    )

    expect(screen.getByRole("button", { name: /Views/i })).toBeInTheDocument()
  })

  it("applies created-date presets from the dates filter", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-17T12:00:00Z"))
    try {
      render(
        <JotaiProvider>
          <ConfirmationDialogProvider>
            <PermissionsProvider
              initialPermissions={{
                groupIds: [],
                isAuthenticated: true,
                isStaff: false,
                isSuperuser: false,
                permissionCodes: ["view_savedview"],
                userId: 1,
              }}
            >
              <FilterPanel
                correspondents={[]}
                documentTypes={[]}
                storagePaths={[]}
                tags={[]}
                savedViews={[]}
                currentUserId={1}
              />
            </PermissionsProvider>
          </ConfirmationDialogProvider>
        </JotaiProvider>
      )

      fireEvent.click(screen.getByRole("button", { name: "Dates" }))
      const createdSection = screen.getByText("Created").parentElement
      expect(createdSection).not.toBeNull()
      fireEvent.click(within(createdSection as HTMLElement).getByRole("button", { name: "Within 1 week" }))

      expect(pushMock).toHaveBeenCalledWith(
        "/documents?created_after=2026-03-10&created_before=2026-03-17"
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it("applies permissions presets with the correct query semantics", async () => {
    render(
      <JotaiProvider>
        <ConfirmationDialogProvider>
          <PermissionsProvider
            initialPermissions={{
              groupIds: [],
              isAuthenticated: true,
              isStaff: false,
              isSuperuser: false,
              permissionCodes: ["view_savedview"],
              userId: 1,
            }}
          >
            <FilterPanel
              correspondents={[]}
              documentTypes={[]}
              storagePaths={[]}
              tags={[]}
              savedViews={[]}
              currentUserId={1}
              users={[{ id: 1, username: "alice" }]}
            />
          </PermissionsProvider>
        </ConfirmationDialogProvider>
      </JotaiProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Permissions" }))
    fireEvent.click(screen.getByRole("button", { name: "Shared by me" }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/documents?shared_by_user=1")
    })
  })

})
