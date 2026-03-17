"use client"

import * as React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { getRealtimeNotificationDispatch } from "@/lib/notifications"
import { getRealtimeClient } from "@/lib/realtime/client"
import {
  latestRealtimeEventAtom,
  realtimeConnectionAtom,
} from "@/lib/stores/realtime"
import {
  notificationPreferencesAtom,
  pushNotificationAtom,
  suppressNotificationToastsAtom,
} from "@/lib/stores/notifications"

export function RealtimeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { status } = useSession()
  const pathname = usePathname()
  const notificationPreferences = useAtomValue(notificationPreferencesAtom)
  const suppressNotificationToasts = useAtomValue(suppressNotificationToastsAtom)
  const setConnection = useSetAtom(realtimeConnectionAtom)
  const setLatestEvent = useSetAtom(latestRealtimeEventAtom)
  const pushNotification = useSetAtom(pushNotificationAtom)

  React.useEffect(() => {
    const client = getRealtimeClient()
    const unsubscribeConnection = client.subscribeConnection(setConnection)
    const unsubscribeEvents = client.subscribeEvents((event) => {
      setLatestEvent(event)
      const dispatch = getRealtimeNotificationDispatch(
        event,
        notificationPreferences
      )
      if (dispatch) {
        pushNotification(dispatch.notification)

        if (
          !suppressNotificationToasts &&
          !(pathname === "/dashboard" && notificationPreferences.suppressOnDashboard)
        ) {
          if (dispatch.toastLevel === "error") {
            toast.error(dispatch.notification.title, {
              description: dispatch.notification.message,
            })
          } else if (dispatch.toastLevel === "success") {
            toast.success(dispatch.notification.title, {
              action: dispatch.notification.href
                ? {
                    label: dispatch.notification.actionLabel ?? "Open",
                    onClick: () => {
                      window.location.href = dispatch.notification.href!
                    },
                  }
                : undefined,
              description: dispatch.notification.message,
            })
          } else {
            toast(dispatch.notification.title, {
              action: dispatch.notification.href
                ? {
                    label: dispatch.notification.actionLabel ?? "Open",
                    onClick: () => {
                      window.location.href = dispatch.notification.href!
                    },
                  }
                : undefined,
              description: dispatch.notification.message,
            })
          }
        }
      }
    })

    if (status === "authenticated") {
      client.connect(process.env.NEXT_PUBLIC_PAPERLESS_WS_URL)
    } else {
      client.disconnect()
    }

    return () => {
      unsubscribeConnection()
      unsubscribeEvents()
    }
  }, [
    notificationPreferences,
    pathname,
    pushNotification,
    setConnection,
    setLatestEvent,
    status,
    suppressNotificationToasts,
  ])

  return <>{children}</>
}
