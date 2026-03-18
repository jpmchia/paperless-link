"use client"

import { useEffect } from "react"
import { useConfirmationDialog } from "@/components/confirmation-dialog-provider"

/**
 * Hook that warns the user when they try to navigate away from a page
 * with unsaved changes. Uses the browser's built-in `beforeunload` event.
 *
 * @param isDirty - Whether there are unsaved changes
 */
export function useUnsavedChanges(isDirty: boolean) {
  const { confirm } = useConfirmationDialog()

  useEffect(() => {
    if (!isDirty) return

    const message = "You have unsaved changes. Are you sure you want to leave?"
    const currentUrl = window.location.href
    const sentinelState = { __unsavedChangesGuard: true }
    let allowBrowserUnload = false
    let bypassNextPop = false

    const handler = (e: BeforeUnloadEvent) => {
      if (allowBrowserUnload) {
        return
      }
      e.preventDefault()
      // Modern browsers ignore custom messages but still show a prompt
      e.returnValue = message
    }

    const clickHandler = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return
      }

      const target = e.target as HTMLElement | null
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target && anchor.target !== "_self") return
      if (anchor.hasAttribute("download")) return

      const nextUrl = new URL(anchor.href, window.location.href)
      const activeUrl = new URL(window.location.href)

      if (nextUrl.origin !== activeUrl.origin) return
      if (nextUrl.href === activeUrl.href) return
      if (
        nextUrl.pathname === activeUrl.pathname &&
        nextUrl.search === activeUrl.search &&
        nextUrl.hash !== activeUrl.hash
      ) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      void confirm({
        actionLabel: "Discard changes",
        cancelLabel: "Stay on page",
        description: message,
        title: "Leave this page?",
      }).then((confirmed) => {
        if (confirmed) {
          allowBrowserUnload = true
          window.location.assign(nextUrl.href)
        }
      })
    }

    const pushSentinel = () => {
      window.history.pushState(sentinelState, "", currentUrl)
    }

    const popStateHandler = () => {
      if (bypassNextPop) {
        bypassNextPop = false
        return
      }

      pushSentinel()
      void confirm({
        actionLabel: "Discard changes",
        cancelLabel: "Stay on page",
        description: message,
        title: "Leave this page?",
      }).then((confirmed) => {
        if (!confirmed) {
          return
        }
        allowBrowserUnload = true
        bypassNextPop = true
        window.history.back()
      })
    }

    pushSentinel()
    window.addEventListener("beforeunload", handler)
    window.addEventListener("popstate", popStateHandler)
    document.addEventListener("click", clickHandler, true)

    return () => {
      window.removeEventListener("beforeunload", handler)
      window.removeEventListener("popstate", popStateHandler)
      document.removeEventListener("click", clickHandler, true)
    }
  }, [confirm, isDirty])
}
