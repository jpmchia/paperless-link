"use client"

import * as React from "react"
import { PermissionGate } from "@/components/permissions/permission-gate"
import { useObjectPermission } from "@/hooks/use-permissions"
import type { PermissionType, PermissionedObject } from "@/lib/permissions"

export function HasObjectPermission({
  action,
  children,
  fallback,
  object,
  type,
}: {
  action: "view" | "change" | "delete"
  children: React.ReactNode
  fallback?: React.ReactNode
  object: PermissionedObject | null | undefined
  type?: PermissionType
}) {
  const allowed = useObjectPermission(action, object, type)
  return <PermissionGate allowed={allowed} fallback={fallback}>{children}</PermissionGate>
}
