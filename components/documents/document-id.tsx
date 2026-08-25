"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const COPIED_RESET_MS = 3000

export function DocumentId({
  documentId,
  className,
}: {
  documentId: number
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)
  const resetTimeoutRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (resetTimeoutRef.current != null) {
        window.clearTimeout(resetTimeoutRef.current)
      }
    }
  }, [])

  const handleCopy = React.useCallback(async () => {
    const value = String(documentId)
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable")
      }
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (resetTimeoutRef.current != null) {
        window.clearTimeout(resetTimeoutRef.current)
      }
      resetTimeoutRef.current = window.setTimeout(() => {
        setCopied(false)
        resetTimeoutRef.current = null
      }, COPIED_RESET_MS)
    } catch {
      toast.error("Failed to copy document ID")
    }
  }, [documentId])

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "h-7 gap-1.5 px-2 font-mono text-xs tabular-nums text-muted-foreground",
        className
      )}
      onClick={() => void handleCopy()}
      aria-label={
        copied
          ? `Document ID ${documentId} copied`
          : `Copy document ID ${documentId}`
      }
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" aria-hidden />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" aria-hidden />
          ID: {documentId}
        </>
      )}
    </Button>
  )
}
