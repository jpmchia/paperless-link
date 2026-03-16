"use client"

import { atom } from "jotai"
import {
  emptyPermissions,
  type CurrentUserPermissions,
} from "@/lib/permissions"

export const currentUserPermissionsAtom = atom<CurrentUserPermissions>(
  emptyPermissions
)

export const setCurrentUserPermissionsAtom = atom(
  null,
  (_get, set, nextPermissions: Partial<CurrentUserPermissions>) => {
    set(currentUserPermissionsAtom, {
      ...emptyPermissions,
      ...nextPermissions,
    })
  }
)
