"use client"

import * as React from "react"
import { useSetAtom } from "jotai"
import type { CurrentUserPermissions } from "@/lib/permissions"
import { setCurrentUserPermissionsAtom } from "@/lib/stores/permissions"

export function PermissionsProvider({
  children,
  initialPermissions,
}: {
  children: React.ReactNode
  initialPermissions: CurrentUserPermissions
}) {
  const setCurrentUserPermissions = useSetAtom(setCurrentUserPermissionsAtom)

  React.useEffect(() => {
    setCurrentUserPermissions(initialPermissions)
  }, [initialPermissions, setCurrentUserPermissions])

  return <>{children}</>
}
