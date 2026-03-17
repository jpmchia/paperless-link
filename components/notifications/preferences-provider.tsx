"use client"

import * as React from "react"
import { useSetAtom } from "jotai"
import type { NotificationPreferences } from "@/lib/notifications"
import { setNotificationPreferencesAtom } from "@/lib/stores/notifications"

export function NotificationPreferencesProvider({
  children,
  initialPreferences,
}: {
  children: React.ReactNode
  initialPreferences: NotificationPreferences
}) {
  const setNotificationPreferences = useSetAtom(setNotificationPreferencesAtom)

  React.useEffect(() => {
    setNotificationPreferences(initialPreferences)
  }, [initialPreferences, setNotificationPreferences])

  return <>{children}</>
}
