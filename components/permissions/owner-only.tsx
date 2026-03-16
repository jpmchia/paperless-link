"use client"

import * as React from "react"
import { PermissionGate } from "@/components/permissions/permission-gate"
import { usePermissions } from "@/hooks/use-permissions"
import type { PermissionedObject } from "@/lib/permissions"

export function OwnerOnly({
  children,
  fallback,
  object,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  object: PermissionedObject | null | undefined
}) {
  const { isOwner } = usePermissions()
  return <PermissionGate allowed={isOwner(object)} fallback={fallback}>{children}</PermissionGate>
}
