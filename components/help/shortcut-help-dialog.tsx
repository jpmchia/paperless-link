"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  formatShortcutChord,
  groupKeyboardShortcuts,
  KEYBOARD_SHORTCUTS,
  type KeyboardShortcut,
} from "@/lib/keyboard-shortcuts"

interface ShortcutHelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shortcuts?: readonly KeyboardShortcut[]
  restoreFocusElement?: HTMLElement | null
}

export function ShortcutHelpDialog({
  open,
  onOpenChange,
  shortcuts = KEYBOARD_SHORTCUTS,
  restoreFocusElement = null,
}: ShortcutHelpDialogProps) {
  const groups = React.useMemo(
    () => groupKeyboardShortcuts(shortcuts),
    [shortcuts]
  )
  const lastFocusedElementRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!open || typeof document === "undefined") return

    lastFocusedElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          const focusTarget =
            restoreFocusElement ?? lastFocusedElementRef.current
          focusTarget?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Move around Paperless-Link faster with the shortcuts available in
            this workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((group) =>
            group.shortcuts.length > 0 ? (
              <section
                key={group.scope}
                className="rounded-lg border border-border/60 bg-muted/20 p-3"
              >
                <h3 className="text-sm font-medium">{group.label}</h3>
                <ul className="mt-3 space-y-3">
                  {group.shortcuts.map((shortcut) => (
                    <li
                      key={shortcut.id}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <p className="font-medium">{shortcut.label}</p>
                        <p className="text-muted-foreground">
                          {shortcut.description}
                        </p>
                      </div>
                      <kbd className="shrink-0 rounded border bg-background px-2 py-1 text-[0.625rem] text-muted-foreground">
                        {formatShortcutChord(shortcut.keyChord)}
                      </kbd>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
