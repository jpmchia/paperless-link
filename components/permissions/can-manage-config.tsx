"use client"

import * as React from "react"
import { PermissionGate } from "@/components/permissions/permission-gate"
import { usePermissions } from "@/hooks/use-permissions"

export function CanManageConfig({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { canManageConfig } = usePermissions()
  return <PermissionGate allowed={canManageConfig} fallback={fallback}>{children}</PermissionGate>
}
