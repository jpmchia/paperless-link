"use client"

import * as React from "react"
import { PermissionGate } from "@/components/permissions/permission-gate"
import { usePermission } from "@/hooks/use-permissions"
import type { PermissionType } from "@/lib/permissions"

export function CanDelete({
  children,
  fallback,
  type,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  type: PermissionType
}) {
  const allowed = usePermission("delete", type)
  return <PermissionGate allowed={allowed} fallback={fallback}>{children}</PermissionGate>
}
