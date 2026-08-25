"use client"

import * as React from "react"
import {
  defaultUserPreferences,
  type UserPreferences,
} from "@/lib/user-preferences"

const UserPreferencesContext = React.createContext<UserPreferences>(
  defaultUserPreferences
)

export function UserPreferencesProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: UserPreferences
}) {
  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  )
}

export function useUserPreferences() {
  return React.useContext(UserPreferencesContext)
}
