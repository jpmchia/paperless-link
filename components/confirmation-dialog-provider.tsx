"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, Trash2 } from "lucide-react"

type ConfirmOptions = {
  actionLabel?: string
  cancelLabel?: string
  description?: React.ReactNode
  tone?: "default" | "destructive"
  title?: React.ReactNode
}

type ConfirmationDialogContextValue = {
  confirm: (options?: ConfirmOptions) => Promise<boolean>
}

const ConfirmationDialogContext =
  React.createContext<ConfirmationDialogContextValue | null>(null)

const DEFAULT_OPTIONS: Required<ConfirmOptions> = {
  actionLabel: "Continue",
  cancelLabel: "Cancel",
  description: "You have unsaved changes. Are you sure you want to continue?",
  tone: "default",
  title: "Discard changes?",
}

export function ConfirmationDialogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<Required<ConfirmOptions>>(DEFAULT_OPTIONS)
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null)

  const closeWithResult = React.useCallback((result: boolean) => {
    setOpen(false)
    const resolver = resolverRef.current
    resolverRef.current = null
    resolver?.(result)
  }, [])

  const confirm = React.useCallback((nextOptions?: ConfirmOptions) => {
    setOptions({
      ...DEFAULT_OPTIONS,
      ...nextOptions,
    })
    setOpen(true)

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  React.useEffect(() => {
    return () => {
      resolverRef.current?.(false)
      resolverRef.current = null
    }
  }, [])

  return (
    <ConfirmationDialogContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeWithResult(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia
              className={
                options.tone === "destructive"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }
            >
              {options.tone === "destructive" ? (
                <Trash2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
            </AlertDialogMedia>
            <AlertDialogTitle>{options.title}</AlertDialogTitle>
            <AlertDialogDescription>{options.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{options.cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => closeWithResult(true)}
              variant={options.tone === "destructive" ? "destructive" : "default"}
            >
              {options.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmationDialogContext.Provider>
  )
}

export function useConfirmationDialog() {
  const context = React.useContext(ConfirmationDialogContext)
  if (!context) {
    throw new Error("useConfirmationDialog must be used within ConfirmationDialogProvider")
  }
  return context
}
