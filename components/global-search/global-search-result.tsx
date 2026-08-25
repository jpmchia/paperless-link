"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { CommandItem, CommandShortcut } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import {
  getGlobalSearchResultLabel,
  type GlobalSearchAction,
  type GlobalSearchActionId,
  type GlobalSearchResult,
} from "@/lib/global-search-actions"

export interface GlobalSearchResultRowProps {
  alternateAction?: GlobalSearchAction | null
  icon?: React.ReactNode
  onAction: (actionId: GlobalSearchActionId, result: GlobalSearchResult) => void
  primaryAction?: GlobalSearchAction | null
  result: GlobalSearchResult
  secondaryAction?: GlobalSearchAction | null
  shortcut?: React.ReactNode
  value?: string
}

type ActionRole = "primary" | "secondary"

function isEnterWithModifier(event: React.KeyboardEvent) {
  return event.key === "Enter" && (event.ctrlKey || event.metaKey)
}

export function GlobalSearchResultRow({
  alternateAction = null,
  icon,
  onAction,
  primaryAction = null,
  result,
  secondaryAction = null,
  shortcut,
  value,
}: GlobalSearchResultRowProps) {
  const label = getGlobalSearchResultLabel(result)
  const commandValue = value ?? `${result.kind}-${result.id}-${label}`
  const primaryButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const secondaryButtonRef = React.useRef<HTMLButtonElement | null>(null)

  const triggerAction = React.useCallback(
    (action: GlobalSearchAction | null) => {
      if (!action) return
      onAction(action.id, result)
    },
    [onAction, result]
  )

  const triggerAlternateAction = React.useCallback(
    (event: React.KeyboardEvent | React.MouseEvent) => {
      if (!alternateAction) return false
      event.preventDefault()
      event.stopPropagation()
      triggerAction(alternateAction)
      return true
    },
    [alternateAction, triggerAction]
  )

  const moveBetweenActions = React.useCallback(
    (role: ActionRole, event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowRight" && role === "primary" && secondaryButtonRef.current) {
        event.preventDefault()
        secondaryButtonRef.current.focus()
        return true
      }

      if (event.key === "ArrowLeft" && role === "secondary" && primaryButtonRef.current) {
        event.preventDefault()
        primaryButtonRef.current.focus()
        return true
      }

      return false
    },
    []
  )

  const suppressRowDefault = (
    event:
      | React.KeyboardEvent<HTMLButtonElement>
      | React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const createActionHandlers = (
    action: GlobalSearchAction | null,
    role: ActionRole
  ) => ({
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      suppressRowDefault(event)
      triggerAction(action)
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (moveBetweenActions(role, event)) {
        return
      }

      if (isEnterWithModifier(event)) {
        if (triggerAlternateAction(event)) {
          return
        }
      }

      if (event.key === "Enter" || event.key === " ") {
        suppressRowDefault(event)
        triggerAction(action)
      }
    },
    onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
    },
  })

  return (
    <CommandItem
      value={commandValue}
      onKeyDown={(event) => {
        if (isEnterWithModifier(event)) {
          void triggerAlternateAction(event)
        }
      }}
      onSelect={() => triggerAction(primaryAction)}
      className="gap-3"
    >
      {icon ? <span className="flex size-4 items-center justify-center">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>

      {primaryAction || secondaryAction ? (
        <span className="ml-auto flex items-center gap-1">
          {primaryAction ? (
            <Button
              ref={primaryButtonRef}
              type="button"
              size="sm"
              variant="secondary"
              aria-label={`${primaryAction.label} ${label}`}
              className={cn(
                "h-7 px-2 text-[11px]",
                secondaryAction ? "min-w-[4.5rem]" : "min-w-[5.5rem]"
              )}
              {...createActionHandlers(primaryAction, "primary")}
            >
              {primaryAction.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button
              ref={secondaryButtonRef}
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`${secondaryAction.label} ${label}`}
              className="h-7 min-w-[5.5rem] px-2 text-[11px]"
              {...createActionHandlers(secondaryAction, "secondary")}
            >
              {secondaryAction.label}
            </Button>
          ) : null}
        </span>
      ) : shortcut ? (
        <CommandShortcut>{shortcut}</CommandShortcut>
      ) : null}
    </CommandItem>
  )
}
