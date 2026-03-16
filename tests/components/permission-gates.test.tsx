import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CanCreate } from "@/components/permissions/can-create"
import { HasObjectPermission } from "@/components/permissions/has-object-permission"
import { JotaiProvider } from "@/components/jotai-provider"
import { PermissionsProvider } from "@/components/permissions/provider"
import type { PermissionedObject } from "@/lib/permissions"

function renderWithPermissions(ui: React.ReactNode) {
  return render(
    <JotaiProvider>
      <PermissionsProvider
        initialPermissions={{
          groupIds: [2],
          isAuthenticated: true,
          isStaff: false,
          isSuperuser: false,
          permissionCodes: ["add_savedview", "view_savedview", "delete_workflow"],
          userId: 10,
        }}
      >
        {ui}
      </PermissionsProvider>
    </JotaiProvider>
  )
}

describe("permission gates", () => {
  it("renders children for granted type permissions", () => {
    renderWithPermissions(
      <CanCreate type="savedView">
        <div>Create allowed</div>
      </CanCreate>
    )

    expect(screen.getByText("Create allowed")).toBeInTheDocument()
  })

  it("hides children when a type permission is missing", () => {
    renderWithPermissions(
      <CanCreate type="workflow">
        <div>Create workflow</div>
      </CanCreate>
    )

    expect(screen.queryByText("Create workflow")).not.toBeInTheDocument()
  })

  it("uses fallback type permissions when object permissions are absent", () => {
    renderWithPermissions(
      <HasObjectPermission
        action="delete"
        object={{} as PermissionedObject}
        type="workflow"
      >
        <div>Delete workflow</div>
      </HasObjectPermission>
    )

    expect(screen.getByText("Delete workflow")).toBeInTheDocument()
  })

  it("respects explicit object permissions over missing type permissions", () => {
    renderWithPermissions(
      <HasObjectPermission
        action="change"
        object={{
          owner: 99,
          permissions: {
            change: {
              groups: [2],
              users: [],
            },
          },
        }}
        type="workflow"
      >
        <div>Change allowed</div>
      </HasObjectPermission>
    )

    expect(screen.getByText("Change allowed")).toBeInTheDocument()
  })
})
