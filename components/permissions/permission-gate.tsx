"use client"

import * as React from "react"

export function PermissionGate({
  allowed,
  children,
  fallback = null,
}: {
  allowed: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return allowed ? <>{children}</> : <>{fallback}</>
}
