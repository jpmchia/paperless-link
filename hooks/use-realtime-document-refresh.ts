"use client"

import * as React from "react"
import { useAtomValue } from "jotai"
import type { RealtimeEvent } from "@/lib/realtime/events"
import { latestRealtimeEventAtom } from "@/lib/stores/realtime"

interface UseRealtimeDocumentRefreshOptions {
  cooldownMs?: number
  documentId: number
  enabled?: boolean
  kinds?: RealtimeEvent["kind"][]
  pause?: boolean
}

const DEFAULT_KINDS: RealtimeEvent["kind"][] = [
  "document-consumed",
  "document-failed",
  "document-updated",
]

function eventTargetsDocument(event: RealtimeEvent, documentId: number) {
  if ("documentId" in event && typeof event.documentId === "number") {
    return event.documentId === documentId
  }

  if (event.kind === "documents-deleted") {
    return event.documentIds.includes(documentId)
  }

  return false
}

export function useRealtimeDocumentRefresh({
  cooldownMs = 1000,
  documentId,
  enabled = true,
  kinds = DEFAULT_KINDS,
  pause = false,
}: UseRealtimeDocumentRefreshOptions) {
  const latestRealtimeEvent = useAtomValue(latestRealtimeEventAtom)
  const [refreshToken, setRefreshToken] = React.useState(0)
  const handledEventRef = React.useRef<string | null>(null)
  const lastRefreshAtRef = React.useRef(0)

  React.useEffect(() => {
    if (!enabled || pause || !latestRealtimeEvent) return
    if (!kinds.includes(latestRealtimeEvent.kind)) return
    if (!eventTargetsDocument(latestRealtimeEvent, documentId)) return

    const eventKey = JSON.stringify(latestRealtimeEvent)
    if (handledEventRef.current === eventKey) return

    handledEventRef.current = eventKey

    const now = Date.now()
    if (now - lastRefreshAtRef.current < cooldownMs) return

    lastRefreshAtRef.current = now
    setRefreshToken((current) => current + 1)
  }, [cooldownMs, documentId, enabled, kinds, latestRealtimeEvent, pause])

  return refreshToken
}
