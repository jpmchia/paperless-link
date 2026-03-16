"use client"

import * as React from "react"
import { useSetAtom } from "jotai"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { getRealtimeClient } from "@/lib/realtime/client"
import type { RealtimeEvent } from "@/lib/realtime/events"
import {
  latestRealtimeEventAtom,
  realtimeConnectionAtom,
} from "@/lib/stores/realtime"
import { pushNotificationAtom } from "@/lib/stores/notifications"

function eventToNotification(event: RealtimeEvent) {
  switch (event.kind) {
    case "document-detected":
      return {
        message: event.filename ?? "A new document was detected.",
        source: "realtime" as const,
        title: "Document detected",
      }
    case "document-consumed":
      return {
        message: event.filename ?? "A document was added to Paperless.",
        source: "realtime" as const,
        title: "Document consumed",
      }
    case "document-failed":
      return {
        message: event.message ?? event.filename ?? "A document failed to process.",
        source: "realtime" as const,
        title: "Document failed",
      }
    default:
      return null
  }
}

export function RealtimeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { status } = useSession()
  const setConnection = useSetAtom(realtimeConnectionAtom)
  const setLatestEvent = useSetAtom(latestRealtimeEventAtom)
  const pushNotification = useSetAtom(pushNotificationAtom)

  React.useEffect(() => {
    const client = getRealtimeClient()
    const unsubscribeConnection = client.subscribeConnection(setConnection)
    const unsubscribeEvents = client.subscribeEvents((event) => {
      setLatestEvent(event)
      const notification = eventToNotification(event)
      if (notification) {
        pushNotification(notification)
        if (event.kind === "document-failed") {
          toast.error(notification.title, { description: notification.message })
        } else {
          toast(notification.title, { description: notification.message })
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
  }, [pushNotification, setConnection, setLatestEvent, status])

  return <>{children}</>
}
