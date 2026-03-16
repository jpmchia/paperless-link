export type PermissionAction =
  | "view"
  | "change"
  | "delete"
  | "create"
  | "share"
  | "owner"

export interface ObjectPermissionAssignment {
  groups?: number[]
  users?: number[]
}

export interface PermissionedObject {
  owner?: number | null
  permissions?: Partial<Record<PermissionAction, ObjectPermissionAssignment>>
}

export interface CurrentUserPermissions {
  groupIds: number[]
  isAuthenticated: boolean
  isStaff: boolean
  isSuperuser: boolean
  userId: number | null
}

export const emptyPermissions: CurrentUserPermissions = {
  groupIds: [],
  isAuthenticated: false,
  isStaff: false,
  isSuperuser: false,
  userId: null,
}

export function isOwner(
  currentUser: CurrentUserPermissions | null,
  object: PermissionedObject | null | undefined
) {
  if (!currentUser?.isAuthenticated || !object) return false
  return currentUser.userId != null && object.owner === currentUser.userId
}

export function hasObjectPermission(
  currentUser: CurrentUserPermissions | null,
  action: PermissionAction,
  object: PermissionedObject | null | undefined
) {
  if (!currentUser?.isAuthenticated || !object) return false
  if (currentUser.isSuperuser) return true

  const assignment = object.permissions?.[action]
  if (!assignment) return isOwner(currentUser, object)

  const hasUserAccess =
    currentUser.userId != null &&
    assignment.users?.includes(currentUser.userId)
  const hasGroupAccess =
    assignment.groups?.some((groupId) => currentUser.groupIds.includes(groupId))

  return Boolean(hasUserAccess || hasGroupAccess || isOwner(currentUser, object))
}

export function canManageConfig(currentUser: CurrentUserPermissions | null) {
  return Boolean(currentUser?.isSuperuser || currentUser?.isStaff)
}
