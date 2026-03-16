"use client"

import { useAtomValue } from "jotai"
import {
  canAccessObject,
  canManageConfig as canManageConfigCheck,
  currentUserCan,
  hasObjectPermission as hasObjectPermissionCheck,
  isOwner as isOwnerCheck,
  type CurrentUserPermissions,
  type PermissionType,
  type PermissionedObject,
  type RoutePermissionAction,
} from "@/lib/permissions"
import { currentUserPermissionsAtom } from "@/lib/stores/permissions"

export function useCurrentUserPermissions(): CurrentUserPermissions {
  return useAtomValue(currentUserPermissionsAtom)
}

export function usePermissions() {
  const currentUser = useCurrentUserPermissions()

  return {
    can: (action: RoutePermissionAction, type: PermissionType) =>
      currentUserCan(currentUser, action, type),
    canAccessObject: (
      action: Extract<RoutePermissionAction, "view" | "change" | "delete">,
      object: PermissionedObject | null | undefined,
      fallbackType?: PermissionType
    ) => canAccessObject(currentUser, action, object, fallbackType),
    canManageConfig: canManageConfigCheck(currentUser),
    currentUser,
    hasObjectPermission: (
      action: "view" | "change" | "delete",
      object: PermissionedObject | null | undefined
    ) => hasObjectPermissionCheck(currentUser, action, object),
    isOwner: (object: PermissionedObject | null | undefined) =>
      isOwnerCheck(currentUser, object),
  }
}

export function usePermission(
  action: RoutePermissionAction,
  type: PermissionType
) {
  const { can } = usePermissions()
  return can(action, type)
}

export function useObjectPermission(
  action: Extract<RoutePermissionAction, "view" | "change" | "delete">,
  object: PermissionedObject | null | undefined,
  fallbackType?: PermissionType
) {
  const { canAccessObject } = usePermissions()
  return canAccessObject(action, object, fallbackType)
}
