"use client"

import * as React from "react"
import { useAtomValue } from "jotai"
import { useRouter } from "next/navigation"
import { latestRealtimeEventAtom } from "@/lib/stores/realtime"

export function RealtimeDocumentListSync() {
  const router = useRouter()
  const latestRealtimeEvent = useAtomValue(latestRealtimeEventAtom)
  const refreshTimeoutRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (!latestRealtimeEvent) return

    switch (latestRealtimeEvent.kind) {
      case "document-consumed":
      case "document-failed":
      case "document-updated":
      case "document-deleted":
      case "documents-deleted":
        if (refreshTimeoutRef.current) {
          window.clearTimeout(refreshTimeoutRef.current)
        }
        refreshTimeoutRef.current = window.setTimeout(() => {
          router.refresh()
          refreshTimeoutRef.current = null
        }, 300)
        break
      default:
        break
    }
  }, [latestRealtimeEvent, router])

  React.useEffect(
    () => () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current)
      }
    },
    []
  )

  return null
}
