"use client"

import { useEffect } from "react"

/**
 * Hook that warns the user when they try to navigate away from a page
 * with unsaved changes. Uses the browser's built-in `beforeunload` event.
 *
 * @param isDirty - Whether there are unsaved changes
 */
export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Modern browsers ignore custom messages but still show a prompt
      e.returnValue = "You have unsaved changes. Are you sure you want to leave?"
    }

    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])
}
