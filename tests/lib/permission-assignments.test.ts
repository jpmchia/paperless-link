import { describe, expect, it } from "vitest"
import {
  emptyPermissionAssignment,
  fromPermissionedObject,
  summarizePermissionAssignment,
  toSetPermissions,
} from "@/lib/permission-assignments"

describe("permission assignment helpers", () => {
  it("maps permissioned objects to assignment values", () => {
    expect(
      fromPermissionedObject({
        owner: 3,
        permissions: {
          view: { users: [1, 1], groups: [9] },
          change: { users: [2], groups: [] },
        },
      })
    ).toEqual({
      owner: 3,
      view_users: [1],
      view_groups: [9],
      change_users: [2],
      change_groups: [],
    })
  })

  it("serializes set_permissions payloads", () => {
    expect(
      toSetPermissions({
        owner: 1,
        view_users: [2],
        view_groups: [3],
        change_users: [4],
        change_groups: [5],
      })
    ).toEqual({
      view: { users: [2], groups: [3] },
      change: { users: [4], groups: [5] },
    })
  })

  it("summarizes sharing for table display", () => {
    expect(
      summarizePermissionAssignment(
        {
          ...emptyPermissionAssignment(1),
          view_users: [2],
          change_groups: [8],
        },
        {
          users: [
            { id: 1, username: "alice" },
            { id: 2, username: "bob" },
          ],
          groups: [{ id: 8, name: "editors" }],
        }
      )
    ).toBe("Owner: alice · View: bob · Edit: editors")
  })
})
