"use client"

import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export interface UiNotification {
  createdAt: string
  id: string
  message: string
  source: "realtime" | "system" | "user"
  title: string
}

const MAX_NOTIFICATIONS = 50

export const notificationsAtom = atomWithStorage<UiNotification[]>(
  "paperless-notifications",
  []
)

export const unreadNotificationCountAtom = atom((get) => {
  return get(notificationsAtom).length
})

export const pushNotificationAtom = atom(
  null,
  (get, set, notification: Omit<UiNotification, "createdAt" | "id">) => {
    const nextNotification: UiNotification = {
      ...notification,
      createdAt: new Date().toISOString(),
      id: crypto.randomUUID(),
    }

    set(
      notificationsAtom,
      [nextNotification, ...get(notificationsAtom)].slice(0, MAX_NOTIFICATIONS)
    )
  }
)

export const clearNotificationsAtom = atom(null, (_get, set) => {
  set(notificationsAtom, [])
})
