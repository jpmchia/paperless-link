import { describe, expect, it } from "vitest"
import { isRouteAllowed, routePermissionRequirements } from "@/lib/route-permissions"
import { mapPermissionBootstrapPayload } from "@/lib/permissions"

describe("route permissions", () => {
  it("allows a user with the matching route permission", () => {
    const currentUser = mapPermissionBootstrapPayload({
      permissions: ["view_workflow"],
      user: { id: 1 },
    })

    expect(
      isRouteAllowed(currentUser, routePermissionRequirements["/workflows"])
    ).toBe(true)
  })

  it("blocks a user who lacks the required route permission", () => {
    const currentUser = mapPermissionBootstrapPayload({
      permissions: ["view_tag"],
      user: { id: 1 },
    })

    expect(
      isRouteAllowed(currentUser, routePermissionRequirements["/mail"])
    ).toBe(false)
  })

  it("respects admin-only route requirements", () => {
    const currentUser = mapPermissionBootstrapPayload({
      permissions: ["view_uisettings"],
      user: { id: 1, is_staff: false },
    })

    expect(
      isRouteAllowed(currentUser, routePermissionRequirements["/settings"])
    ).toBe(false)
  })
})
