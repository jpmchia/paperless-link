"use client"

import * as React from "react"
import { useHydrateAtoms } from "jotai/utils"
import type { CurrentUserPermissions } from "@/lib/permissions"
import { currentUserPermissionsAtom } from "@/lib/stores/permissions"

export function PermissionsProvider({
  children,
  initialPermissions,
}: {
  children: React.ReactNode
  initialPermissions: CurrentUserPermissions
}) {
  useHydrateAtoms([[currentUserPermissionsAtom, initialPermissions]])

  return <>{children}</>
}
