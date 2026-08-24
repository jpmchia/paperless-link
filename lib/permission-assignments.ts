import type { PermissionedObject } from "@/lib/permissions"

export type PermissionAssignmentValue = {
  owner: number | null
  view_users: number[]
  view_groups: number[]
  change_users: number[]
  change_groups: number[]
}

export type SetPermissionsPayload = {
  view: { users: number[]; groups: number[] }
  change: { users: number[]; groups: number[] }
}

function uniqueIds(ids: number[]): number[] {
  return Array.from(new Set(ids.filter((id) => Number.isFinite(id))))
}

export function emptyPermissionAssignment(
  owner: number | null = null
): PermissionAssignmentValue {
  return {
    owner,
    view_users: [],
    view_groups: [],
    change_users: [],
    change_groups: [],
  }
}

export function fromPermissionedObject(
  object: PermissionedObject | null | undefined,
  fallbackOwner: number | null = null
): PermissionAssignmentValue {
  return {
    owner: object?.owner ?? fallbackOwner,
    view_users: uniqueIds(object?.permissions?.view?.users ?? []),
    view_groups: uniqueIds(object?.permissions?.view?.groups ?? []),
    change_users: uniqueIds(object?.permissions?.change?.users ?? []),
    change_groups: uniqueIds(object?.permissions?.change?.groups ?? []),
  }
}

export function toSetPermissions(
  value: PermissionAssignmentValue
): SetPermissionsPayload {
  return {
    view: {
      users: uniqueIds(value.view_users),
      groups: uniqueIds(value.view_groups),
    },
    change: {
      users: uniqueIds(value.change_users),
      groups: uniqueIds(value.change_groups),
    },
  }
}

export function summarizePermissionAssignment(
  value: PermissionAssignmentValue,
  lookups: {
    users: Array<{ id: number; username?: string }>
    groups: Array<{ id: number; name: string }>
  }
): string {
  const userName = (id: number) =>
    lookups.users.find((user) => user.id === id)?.username ?? `User ${id}`
  const groupName = (id: number) =>
    lookups.groups.find((group) => group.id === id)?.name ?? `Group ${id}`

  const parts: string[] = []
  if (value.owner != null) {
    parts.push(`Owner: ${userName(value.owner)}`)
  }
  const viewers = [
    ...value.view_users.map(userName),
    ...value.view_groups.map(groupName),
  ]
  if (viewers.length > 0) {
    parts.push(`View: ${viewers.join(", ")}`)
  }
  const editors = [
    ...value.change_users.map(userName),
    ...value.change_groups.map(groupName),
  ]
  if (editors.length > 0) {
    parts.push(`Edit: ${editors.join(", ")}`)
  }
  return parts.length > 0 ? parts.join(" · ") : "Private"
}
