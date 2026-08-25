"use client"

import * as React from "react"
import { CircleHelp, Keyboard } from "lucide-react"
import { toast } from "sonner"
import { updateUiSettings } from "@/app/actions/ui-settings"
import { ShortcutHelpDialog } from "@/components/help/shortcut-help-dialog"
import { WelcomeDialog } from "@/components/help/welcome-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getKeyboardShortcut,
  isEditableElement,
  matchesShortcutEvent,
} from "@/lib/keyboard-shortcuts"
import { SETTINGS_KEYS } from "@/data/ui-settings"

interface HelpMenuProps {
  initialTourComplete: boolean
}

const openShortcutHelpShortcut = getKeyboardShortcut("global.shortcut-help")

export function HelpMenu({ initialTourComplete }: HelpMenuProps) {
  const [tourComplete, setTourComplete] = React.useState(initialTourComplete)
  const [shortcutHelpOpen, setShortcutHelpOpen] = React.useState(false)
  const [welcomeOpen, setWelcomeOpen] = React.useState(false)
  const [savingWelcomeState, setSavingWelcomeState] = React.useState(false)
  const shortcutRestoreFocusRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!initialTourComplete) {
      setWelcomeOpen(true)
    }
  }, [initialTourComplete])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) return
      if (!matchesShortcutEvent(event, openShortcutHelpShortcut.keyChord))
        return

      shortcutRestoreFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      event.preventDefault()
      setShortcutHelpOpen(true)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const markWelcomeComplete = React.useCallback(async () => {
    if (tourComplete) {
      setWelcomeOpen(false)
      return
    }

    setSavingWelcomeState(true)
    try {
      await updateUiSettings({
        [SETTINGS_KEYS.TOUR_COMPLETE]: true,
      })
      setTourComplete(true)
      setWelcomeOpen(false)
    } catch (error) {
      toast.error("Could not save welcome preference", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setSavingWelcomeState(false)
    }
  }, [tourComplete])

  const openShortcutHelp = React.useCallback(() => {
    shortcutRestoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    setShortcutHelpOpen(true)
  }, [])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Open help"
          >
            <CircleHelp className="size-4" />
            Help
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onClick={() => setWelcomeOpen(true)}>
            <CircleHelp className="size-4" />
            Welcome
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openShortcutHelp}>
            <Keyboard className="size-4" />
            Keyboard shortcuts
            <DropdownMenuShortcut>Shift+?</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShortcutHelpDialog
        open={shortcutHelpOpen}
        onOpenChange={setShortcutHelpOpen}
        restoreFocusElement={shortcutRestoreFocusRef.current}
      />
      <WelcomeDialog
        open={welcomeOpen}
        onOpenChange={(open) => {
          if (!savingWelcomeState) {
            setWelcomeOpen(open)
          }
        }}
        onContinue={markWelcomeComplete}
        onDismiss={markWelcomeComplete}
        onOpenShortcutHelp={openShortcutHelp}
        saving={savingWelcomeState}
      />
    </>
  )
}
