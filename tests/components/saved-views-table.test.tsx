import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SavedViewsTable } from "@/app/savedviews/saved-views-table"
import { JotaiProvider } from "@/components/jotai-provider"
import { PermissionsProvider } from "@/components/permissions/provider"
import type { DocumentDisplayMode } from "@/app/documents/display-mode"

const patchSavedViewMock = vi.fn()
const createSavedViewMock = vi.fn()
const updateSavedViewMetaMock = vi.fn()
const deleteSavedViewManagementMock = vi.fn()

vi.mock("@/app/documents/saved-view-actions", () => ({
  patchSavedView: (...args: unknown[]) => patchSavedViewMock(...args),
  createSavedView: (...args: unknown[]) => createSavedViewMock(...args),
}))

vi.mock("@/lib/management-actions", () => ({
  updateSavedViewMeta: (...args: unknown[]) => updateSavedViewMetaMock(...args),
  deleteSavedViewManagement: (...args: unknown[]) => deleteSavedViewManagementMock(...args),
}))

const baseView = {
  id: 7,
  name: "Invoices",
  show_on_dashboard: false,
  show_in_sidebar: false,
  sort_field: "created",
  sort_reverse: true,
  filter_rules: [{ rule_type: 20, value: "invoice" }],
  page_size: 25,
  display_mode: "table" as DocumentDisplayMode,
  display_fields: ["title", "created"],
}

function renderSavedViewsTable(permissionCodes: string[] = ["view_savedview", "change_savedview", "delete_savedview", "add_savedview"]) {
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
        <SavedViewsTable
          initialViews={[baseView]}
          correspondents={[]}
          documentTypes={[]}
          storagePaths={[]}
          tags={[]}
          users={[]}
          customFields={[]}
        />
      </PermissionsProvider>
    </JotaiProvider>
  )
}

describe("SavedViewsTable", () => {
  beforeEach(() => {
    patchSavedViewMock.mockReset()
    createSavedViewMock.mockReset()
    updateSavedViewMetaMock.mockReset()
    deleteSavedViewManagementMock.mockReset()
  })

  it("updates a saved view through the full editor", async () => {
    patchSavedViewMock.mockResolvedValue({ ...baseView, name: "Updated invoices" })

    renderSavedViewsTable()

    fireEvent.click(screen.getByRole("button", { name: "Edit Invoices" }))
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Updated invoices" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(patchSavedViewMock).toHaveBeenCalledWith(7, expect.objectContaining({
        name: "Updated invoices",
        filter_rules: [{ rule_type: 20, value: "invoice" }],
        display_fields: ["title", "created"],
      }))
    })
  })

  it("duplicates a saved view", async () => {
    createSavedViewMock.mockResolvedValue({ ...baseView, id: 9, name: "Invoices Copy" })

    renderSavedViewsTable()

    fireEvent.click(screen.getByRole("button", { name: "Duplicate Invoices" }))

    await waitFor(() => {
      expect(createSavedViewMock).toHaveBeenCalledWith(expect.objectContaining({
        name: "Invoices Copy",
        filter_rules: [{ rule_type: 20, value: "invoice" }],
        display_fields: ["title", "created"],
      }))
    })
  })

  it("hides edit and duplicate actions when permissions are missing", () => {
    renderSavedViewsTable(["view_savedview"])

    expect(screen.queryByRole("button", { name: "Edit Invoices" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Duplicate Invoices" })).not.toBeInTheDocument()
  })
})
