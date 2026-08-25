import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CustomFieldsTable } from "@/app/custom-fields/custom-fields-table"
import { PermissionsProvider } from "@/components/permissions/provider"

const createCustomFieldMock = vi.fn()

vi.mock("@/lib/management-actions", () => ({
  createCustomField: (...args: unknown[]) => createCustomFieldMock(...args),
  deleteCustomField: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

function renderTable() {
  return render(
    <PermissionsProvider
      initialPermissions={{
        groupIds: [],
        isAuthenticated: true,
        isStaff: false,
        isSuperuser: false,
        permissionCodes: ["add_customfield", "delete_customfield"],
        userId: 1,
      }}
    >
      <CustomFieldsTable initialItems={[]} />
    </PermissionsProvider>
  )
}

describe("CustomFieldsTable", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
    createCustomFieldMock.mockReset()
    createCustomFieldMock.mockResolvedValue({
      data_type: "long_text",
      id: 1,
      name: "Summary",
    })
  })

  it("creates a long text custom field with the Paperless data type", async () => {
    renderTable()

    fireEvent.click(screen.getByRole("button", { name: /Create Custom Field/i }))
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Summary" },
    })
    fireEvent.click(screen.getByRole("combobox"))
    fireEvent.click(await screen.findByRole("option", { name: "Long text" }))
    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    await waitFor(() => {
      expect(createCustomFieldMock).toHaveBeenCalledWith({
        data_type: "long_text",
        name: "Summary",
      })
    })
  })
})
