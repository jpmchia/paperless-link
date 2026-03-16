export type PermissionAction =
  | "view"
  | "change"
  | "delete"
  | "create"
  | "share"
  | "owner"

export type RoutePermissionAction = Extract<
  PermissionAction,
  "view" | "change" | "delete" | "create"
>

export type PermissionType =
  | "document"
  | "tag"
  | "correspondent"
  | "documentType"
  | "storagePath"
  | "savedView"
  | "paperlessTask"
  | "appConfig"
  | "uiSettings"
  | "history"
  | "note"
  | "mailAccount"
  | "mailRule"
  | "user"
  | "group"
  | "shareLink"
  | "customField"
  | "workflow"
  | "processedMail"

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
  permissionCodes: string[]
  isStaff: boolean
  isSuperuser: boolean
  userId: number | null
}

export interface PermissionBootstrapUser {
  groups?: number[] | null
  id?: number | null
  is_staff?: boolean | null
  is_superuser?: boolean | null
}

export interface PermissionBootstrapPayload {
  permissions?: string[] | null
  user?: PermissionBootstrapUser | null
}

const PERMISSION_TYPE_CODES: Record<PermissionType, string> = {
  appConfig: "%s_applicationconfiguration",
  correspondent: "%s_correspondent",
  customField: "%s_customfield",
  document: "%s_document",
  documentType: "%s_documenttype",
  group: "%s_group",
  history: "%s_logentry",
  mailAccount: "%s_mailaccount",
  mailRule: "%s_mailrule",
  note: "%s_note",
  paperlessTask: "%s_paperlesstask",
  processedMail: "%s_processedmail",
  savedView: "%s_savedview",
  shareLink: "%s_sharelink",
  storagePath: "%s_storagepath",
  tag: "%s_tag",
  uiSettings: "%s_uisettings",
  user: "%s_user",
  workflow: "%s_workflow",
}

export const emptyPermissions: CurrentUserPermissions = {
  groupIds: [],
  isAuthenticated: false,
  permissionCodes: [],
  isStaff: false,
  isSuperuser: false,
  userId: null,
}

function normalizeAction(action: RoutePermissionAction) {
  return action === "create" ? "add" : action
}

export function mapPermissionBootstrapPayload(
  payload: PermissionBootstrapPayload | null | undefined
): CurrentUserPermissions {
  const user = payload?.user

  return {
    groupIds: Array.isArray(user?.groups)
      ? user.groups.filter((groupId): groupId is number => typeof groupId === "number")
      : [],
    isAuthenticated: typeof user?.id === "number",
    permissionCodes: Array.isArray(payload?.permissions)
      ? payload.permissions.filter(
          (permissionCode): permissionCode is string =>
            typeof permissionCode === "string" && permissionCode.length > 0
        )
      : [],
    isStaff: Boolean(user?.is_staff),
    isSuperuser: Boolean(user?.is_superuser),
    userId: typeof user?.id === "number" ? user.id : null,
  }
}

export function getPermissionCode(
  action: RoutePermissionAction,
  type: PermissionType
) {
  return PERMISSION_TYPE_CODES[type].replace("%s", normalizeAction(action))
}

export function currentUserCan(
  currentUser: CurrentUserPermissions | null,
  action: RoutePermissionAction,
  type: PermissionType
) {
  if (!currentUser?.isAuthenticated) return false
  if (currentUser.isSuperuser) return true

  return currentUser.permissionCodes.includes(getPermissionCode(action, type))
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
