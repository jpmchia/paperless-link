import type {
  CurrentUserPermissions,
  PermissionType,
  RoutePermissionAction,
} from "@/lib/permissions"
import { canManageConfig, currentUserCan } from "@/lib/permissions"

export interface RoutePermissionCheck {
  action: RoutePermissionAction
  type: PermissionType
}

export interface RoutePermissionRequirement {
  allOf?: RoutePermissionCheck[]
  anyOf?: RoutePermissionCheck[]
  requireAdmin?: boolean
}

export type RoutePermissionKey =
  | "/dashboard"
  | "/correspondents"
  | "/custom-fields"
  | "/document-types"
  | "/documents"
  | "/logs"
  | "/mail"
  | "/savedviews"
  | "/settings"
  | "/storage-paths"
  | "/tags"
  | "/tasks"
  | "/trash"
  | "/users"
  | "/workflows"

export const routePermissionRequirements: Record<
  RoutePermissionKey,
  RoutePermissionRequirement
> = {
  "/dashboard": {
    anyOf: [{ action: "view", type: "document" }],
  },
  "/correspondents": {
    anyOf: [{ action: "view", type: "correspondent" }],
  },
  "/custom-fields": {
    anyOf: [{ action: "view", type: "customField" }],
  },
  "/document-types": {
    anyOf: [{ action: "view", type: "documentType" }],
  },
  "/documents": {
    anyOf: [{ action: "view", type: "document" }],
  },
  "/logs": {
    anyOf: [{ action: "view", type: "history" }],
  },
  "/mail": {
    anyOf: [
      { action: "view", type: "mailAccount" },
      { action: "view", type: "mailRule" },
      { action: "view", type: "processedMail" },
    ],
  },
  "/savedviews": {
    anyOf: [{ action: "view", type: "savedView" }],
  },
  "/settings": {
    requireAdmin: true,
  },
  "/storage-paths": {
    anyOf: [{ action: "view", type: "storagePath" }],
  },
  "/tags": {
    anyOf: [{ action: "view", type: "tag" }],
  },
  "/tasks": {
    anyOf: [{ action: "view", type: "paperlessTask" }],
  },
  "/trash": {
    anyOf: [{ action: "view", type: "document" }],
  },
  "/users": {
    anyOf: [
      { action: "view", type: "user" },
      { action: "view", type: "group" },
    ],
  },
  "/workflows": {
    anyOf: [{ action: "view", type: "workflow" }],
  },
}

export function isRouteAllowed(
  currentUser: CurrentUserPermissions,
  requirement: RoutePermissionRequirement
) {
  if (requirement.requireAdmin && !canManageConfig(currentUser)) {
    return false
  }

  if (requirement.allOf?.some((check) => !currentUserCan(currentUser, check.action, check.type))) {
    return false
  }

  if (
    requirement.anyOf?.length &&
    !requirement.anyOf.some((check) =>
      currentUserCan(currentUser, check.action, check.type)
    )
  ) {
    return false
  }

  return true
}
