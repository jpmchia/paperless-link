import { render, screen, waitFor } from "@testing-library/react"
import { useAtomValue } from "jotai"
import { describe, expect, it } from "vitest"
import { JotaiProvider } from "@/components/jotai-provider"
import { PermissionsProvider } from "@/components/permissions/provider"
import { currentUserPermissionsAtom } from "@/lib/stores/permissions"

function PermissionProbe() {
  const permissions = useAtomValue(currentUserPermissionsAtom)

  return (
    <>
      <div>{String(permissions.userId)}</div>
      <div>{String(permissions.isStaff)}</div>
      <div>{permissions.permissionCodes.join(",")}</div>
    </>
  )
}

describe("PermissionsProvider", () => {
  it("hydrates the current-user permission store", async () => {
    render(
      <JotaiProvider>
        <PermissionsProvider
          initialPermissions={{
            groupIds: [3],
            isAuthenticated: true,
            isStaff: true,
            isSuperuser: false,
            permissionCodes: ["view_tag"],
            userId: 99,
          }}
        >
          <PermissionProbe />
        </PermissionsProvider>
      </JotaiProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("99")).toBeInTheDocument()
      expect(screen.getByText("true")).toBeInTheDocument()
      expect(screen.getByText("view_tag")).toBeInTheDocument()
    })
  })

  it("rehydrates when the server permission snapshot changes", async () => {
    const { rerender } = render(
      <JotaiProvider>
        <PermissionsProvider
          initialPermissions={{
            groupIds: [3],
            isAuthenticated: true,
            isStaff: false,
            isSuperuser: false,
            permissionCodes: ["view_savedview"],
            userId: 11,
          }}
        >
          <PermissionProbe />
        </PermissionsProvider>
      </JotaiProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("11")).toBeInTheDocument()
      expect(screen.getByText("view_savedview")).toBeInTheDocument()
    })

    rerender(
      <JotaiProvider>
        <PermissionsProvider
          initialPermissions={{
            groupIds: [3],
            isAuthenticated: true,
            isStaff: true,
            isSuperuser: false,
            permissionCodes: ["view_savedview", "view_uisettings"],
            userId: 11,
          }}
        >
          <PermissionProbe />
        </PermissionsProvider>
      </JotaiProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("true")).toBeInTheDocument()
      expect(screen.getByText("view_savedview,view_uisettings")).toBeInTheDocument()
    })
  })
})
