"use client"

import * as React from "react"
import { useAtomValue } from "jotai"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { documentDetailsDirtyAtom } from "@/lib/store"
import { latestRealtimeEventAtom } from "@/lib/stores/realtime"

export function RealtimeDocumentDetailSync({
  documentId,
  title,
}: {
  documentId: number
  title: string
}) {
  const router = useRouter()
  const isDirty = useAtomValue(documentDetailsDirtyAtom)
  const latestRealtimeEvent = useAtomValue(latestRealtimeEventAtom)
  const handledEventRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!latestRealtimeEvent) return

    const eventKey = JSON.stringify(latestRealtimeEvent)
    if (handledEventRef.current === eventKey) return

    const matchesCurrentDocument =
      ("documentId" in latestRealtimeEvent &&
        latestRealtimeEvent.documentId === documentId) ||
      (latestRealtimeEvent.kind === "documents-deleted" &&
        latestRealtimeEvent.documentIds.includes(documentId))

    if (!matchesCurrentDocument) return

    handledEventRef.current = eventKey

    switch (latestRealtimeEvent.kind) {
      case "document-deleted":
      case "documents-deleted":
        toast.error(`${title} was removed`, {
          description: "Returning to the document list.",
        })
        router.push("/documents")
        break
      case "document-updated":
      case "document-consumed":
        if (isDirty) {
          toast(`${title} changed remotely`, {
            action: {
              label: "Reload",
              onClick: () => router.refresh(),
            },
            description: "Save or discard your edits before reloading.",
          })
        } else {
          router.refresh()
        }
        break
      case "document-failed":
        if (!isDirty) {
          router.refresh()
        }
        break
      default:
        break
    }
  }, [documentId, isDirty, latestRealtimeEvent, router, title])

  return null
}
