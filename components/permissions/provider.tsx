"use client"

import * as React from "react"
import { useHydrateAtoms } from "jotai/utils"
import { useSetAtom } from "jotai"
import type { CurrentUserPermissions } from "@/lib/permissions"
import { currentUserPermissionsAtom } from "@/lib/stores/permissions"

export function PermissionsProvider({
  children,
  initialPermissions,
}: {
  children: React.ReactNode
  initialPermissions: CurrentUserPermissions
}) {
  const setCurrentUserPermissions = useSetAtom(currentUserPermissionsAtom)
  useHydrateAtoms([[currentUserPermissionsAtom, initialPermissions]])

  React.useEffect(() => {
    setCurrentUserPermissions(initialPermissions)
  }, [initialPermissions, setCurrentUserPermissions])

  return <>{children}</>
}
