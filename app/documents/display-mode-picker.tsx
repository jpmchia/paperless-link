"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { LayoutGrid, LayoutList, PanelsTopLeft } from "lucide-react"
import {
  DEFAULT_DOCUMENT_DISPLAY_MODE,
  type DocumentDisplayMode,
} from "./display-mode"

interface DisplayModePickerProps {
  displayMode: DocumentDisplayMode
  onDisplayModeChange: (mode: DocumentDisplayMode) => void
}

const MODES: Array<{
  mode: DocumentDisplayMode
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { mode: "table", label: "Table view", icon: LayoutList },
  { mode: "smallCards", label: "Small cards", icon: LayoutGrid },
  { mode: "largeCards", label: "Large cards", icon: PanelsTopLeft },
]

export function DisplayModePicker({
  displayMode = DEFAULT_DOCUMENT_DISPLAY_MODE,
  onDisplayModeChange,
}: DisplayModePickerProps) {
  return (
    <div
      className="inline-flex h-8 items-center rounded-md border border-muted-foreground/20 bg-background p-0.5"
      role="group"
      aria-label="Document display mode"
    >
      {MODES.map(({ mode, label, icon: Icon }) => {
        const active = displayMode === mode
        return (
          <Button
            key={mode}
            type="button"
            variant="ghost"
            size="sm"
            aria-label={label}
            aria-pressed={active}
            onClick={() => onDisplayModeChange(mode)}
            className={
              "h-7 px-2 text-muted-foreground hover:text-foreground " +
              (active ? "bg-accent text-foreground shadow-sm" : "")
            }
            title={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        )
      })}
    </div>
  )
}
