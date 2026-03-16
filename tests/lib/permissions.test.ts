import { describe, expect, it } from "vitest"
import {
  currentUserCan,
  getPermissionCode,
  mapPermissionBootstrapPayload,
} from "@/lib/permissions"

describe("permissions", () => {
  it("maps ui-settings bootstrap payload into current-user permissions", () => {
    const permissions = mapPermissionBootstrapPayload({
      permissions: ["view_tag", "change_savedview"],
      user: {
        groups: [1, 2],
        id: 42,
        is_staff: true,
        is_superuser: false,
      },
    })

    expect(permissions).toEqual({
      groupIds: [1, 2],
      isAuthenticated: true,
      permissionCodes: ["view_tag", "change_savedview"],
      isStaff: true,
      isSuperuser: false,
      userId: 42,
    })
  })

  it("builds permission codes using the backend add_* naming", () => {
    expect(getPermissionCode("create", "document")).toBe("add_document")
  })

  it("checks current-user capability from permission codes", () => {
    const permissions = mapPermissionBootstrapPayload({
      permissions: ["view_tag"],
      user: { id: 7 },
    })

    expect(currentUserCan(permissions, "view", "tag")).toBe(true)
    expect(currentUserCan(permissions, "change", "tag")).toBe(false)
  })
})
