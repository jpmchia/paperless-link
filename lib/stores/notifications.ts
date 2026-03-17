"use client"

import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type {
  NotificationLevel,
  NotificationPreferences,
} from "@/lib/notifications"
import { defaultNotificationPreferences } from "@/lib/notifications"

export interface UiNotification {
  actionLabel?: string
  createdAt: string
  dedupeKey?: string
  documentId?: number
  href?: string
  id: string
  kind:
    | "document-detected"
    | "document-consumed"
    | "document-failed"
    | "document-updated"
    | "document-deleted"
    | "system"
    | "user-action"
  level: NotificationLevel
  message: string
  read: boolean
  source: "realtime" | "system" | "user"
  title: string
}

const MAX_NOTIFICATIONS = 50

export const notificationsAtom = atomWithStorage<UiNotification[]>(
  "paperless-notifications",
  []
)

export const notificationPreferencesAtom =
  atomWithStorage<NotificationPreferences>(
    "paperless-notification-preferences",
    defaultNotificationPreferences
  )

export const setNotificationPreferencesAtom = atom(
  null,
  (_get, set, preferences: NotificationPreferences) => {
    set(notificationPreferencesAtom, preferences)
  }
)

export const suppressNotificationToastsAtom = atom(false)

export const unreadNotificationCountAtom = atom((get) => {
  return get(notificationsAtom).filter((notification) => !notification.read).length
})

export const pushNotificationAtom = atom(
  null,
  (
    get,
    set,
    notification: Omit<UiNotification, "createdAt" | "id" | "read"> & {
      read?: boolean
    }
  ) => {
    const nextNotification: UiNotification = {
      ...notification,
      createdAt: new Date().toISOString(),
      id: crypto.randomUUID(),
      read: notification.read ?? false,
    }

    const existingNotifications = get(notificationsAtom)
    const existingIndex = notification.dedupeKey
      ? existingNotifications.findIndex(
          (entry) => entry.dedupeKey === notification.dedupeKey
        )
      : -1

    if (existingIndex >= 0) {
      const nextNotifications = [...existingNotifications]
      nextNotifications.splice(existingIndex, 1)
      set(
        notificationsAtom,
        [nextNotification, ...nextNotifications].slice(0, MAX_NOTIFICATIONS)
      )
      return
    }

    set(
      notificationsAtom,
      [nextNotification, ...existingNotifications].slice(0, MAX_NOTIFICATIONS)
    )
  }
)

export const markNotificationReadAtom = atom(
  null,
  (get, set, notificationId: string) => {
    set(
      notificationsAtom,
      get(notificationsAtom).map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    )
  }
)

export const markAllNotificationsReadAtom = atom(null, (get, set) => {
  set(
    notificationsAtom,
    get(notificationsAtom).map((notification) => ({
      ...notification,
      read: true,
    }))
  )
})

export const clearNotificationsAtom = atom(null, (_get, set) => {
  set(notificationsAtom, [])
})
