"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { GripVertical, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useDraggable } from "@/hooks/use-draggable"
import { useResizable } from "@/hooks/use-resizable"

// ── Context for drag handle propagation ─────────────────────────────────
// DialogHeader automatically becomes the drag handle when rendered inside
// a DraggableDialog's DialogContent.

interface DraggableDialogContextValue {
  dragHandleProps: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
  isDragging: boolean
}

const DraggableDialogContext =
  React.createContext<DraggableDialogContextValue | null>(null)

export function useDraggableDialogContext() {
  return React.useContext(DraggableDialogContext)
}

// ── Unchanged Radix primitives ──────────────────────────────────────────

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

// ── Overlay ─────────────────────────────────────────────────────────────

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// ── DialogContent (enhanced) ────────────────────────────────────────────

interface DraggableDialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Enable drag-to-move (default: true) */
  draggable?: boolean
  /** Enable resize handle (default: true) */
  resizable?: boolean
  /** Resize axes — defaults to "both" when initialHeight is set, "horizontal" otherwise */
  resizeDirection?: "horizontal" | "vertical" | "both"
  /** Initial dialog width in px (default: 480) */
  initialWidth?: number
  /** Initial dialog height in px — omit for auto-height (content-sized) */
  initialHeight?: number
  /** Minimum resize width (default: 320) */
  minWidth?: number
  /** Maximum resize width (default: 960) */
  maxWidth?: number
  /** Minimum resize height (default: 200) */
  minHeight?: number
  /** Maximum resize height (default: 800) */
  maxHeight?: number
  /** Backdrop-filter blur (default: 8) */
  blur?: number
  /** Backdrop-filter saturate (default: 2.8) */
  saturate?: number
  /** Backdrop-filter brightness (default: 1.5) */
  brightness?: number
  /** Backdrop-filter contrast (default: 1) */
  contrast?: number
  /** Border width in px (default: 1) */
  borderWidth?: number
  /** Inner bg opacity 0-1 (default: 0.825) */
  bgOpacity?: number
  /** Show overlay behind dialog (default: true) */
  overlay?: boolean
}

const DialogContent = React.forwardRef<
  HTMLDivElement,
  DraggableDialogContentProps
>(
  (
    {
      className,
      children,
      draggable = true,
      resizable = true,
      resizeDirection: resizeDirectionProp,
      initialWidth = 480,
      initialHeight,
      minWidth = 320,
      maxWidth = 960,
      minHeight = 200,
      maxHeight = 800,
      blur = 8,
      saturate = 2.8,
      brightness = 1.5,
      contrast = 1,
      borderWidth = 1,
      bgOpacity = 0.975,
      overlay = true,
      onInteractOutside,
      onEscapeKeyDown,
      ...props
    },
    ref,
  ) => {
    const panelRef = React.useRef<HTMLDivElement>(null)
    React.useImperativeHandle(ref, () => panelRef.current!)

    const hasFixedHeight = initialHeight != null
    const effectiveHeight = initialHeight ?? 400
    const resizeDirection =
      resizeDirectionProp ?? (hasFixedHeight ? "both" : "horizontal")

    // Center in viewport on first mount
    const [initialPosition] = React.useState(() => {
      if (typeof window === "undefined") return { x: 0, y: 0 }
      return {
        x: Math.max(0, Math.round((window.innerWidth - initialWidth) / 2)),
        y: Math.max(
          0,
          Math.round((window.innerHeight - effectiveHeight) / 2),
        ),
      }
    })

    const { position, isDragging, dragHandleProps } = useDraggable({
      enabled: draggable,
      initialPosition,
      panelRef,
      elementSize: { width: initialWidth, height: effectiveHeight },
      constrainToViewport: true,
    })

    const attachPanelRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        panelRef.current = node
        if (node) {
          node.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`
        }
      },
      [position.x, position.y],
    )

    // Keep element size in sync with resizable for viewport constraining
    const { size, isResizing, resizeHandleProps } = useResizable({
      initialSize: { width: initialWidth, height: effectiveHeight },
      containerRef: panelRef,
      direction: resizeDirection,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
      enabled: resizable,
    })

    // Memoised to avoid Firefox compositing bugs during drag
    // (see useDraggable header comment for full explanation).
    const panelStyle = React.useMemo<React.CSSProperties>(
      () => ({
        position: "fixed" as const,
        left: 0,
        top: 0,
        width: size.width,
        height: hasFixedHeight ? size.height : undefined,
        zIndex: 50,
      }),
      [size.width, size.height, hasFixedHeight],
    )

    return (
      <DialogPortal>
        {overlay && <DialogOverlay />}
        <DialogPrimitive.Content
          asChild
          onInteractOutside={(e) => {
            if (isDragging || isResizing) e.preventDefault()
            onInteractOutside?.(e)
          }}
          onEscapeKeyDown={(e) => {
            if (isDragging || isResizing) e.preventDefault()
            onEscapeKeyDown?.(e)
          }}
          {...props}
        >
          <div
            ref={attachPanelRef}
            className={cn(
              "flex flex-col outline-none",
              isDragging && "select-none",
              className,
            )}
            style={panelStyle}
          >
          <div
            data-saturated-borders
            className="relative isolate flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg"
            style={
              {
                "--sb-blur": blur,
                "--sb-saturate": saturate,
                "--sb-brightness": brightness,
                "--sb-contrast": contrast,
                "--sb-border": borderWidth,
              } as React.CSSProperties
            }
          >
            {/* Translucent card backdrop */}
            <div
              className="absolute inset-0 bg-background"
              style={{ opacity: bgOpacity }}
            />

            {/* Children — DialogHeader becomes drag handle via context */}
            <DraggableDialogContext.Provider
              value={{ dragHandleProps, isDragging }}
            >
              <div className="relative flex min-h-0 flex-1 flex-col">
                {children}
              </div>
            </DraggableDialogContext.Provider>

            {/* Close button */}
            {/* <HeaderButton onClick={handleClose} title="Close" variant="destructive">
                    <X className="h-4 w-4" />
                  </HeaderButton> */}
            <DialogPrimitive.Close
              className="absolute right-3 top-3 z-20 rounded-md p-1.5 w-7 h-7 justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              //absolute right-3 top-3 z-20 rounded-md p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              data-no-drag
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>

            {/* Resize handle */}
            {resizable && (
              <div
                className="absolute bottom-1 right-1 z-50 flex h-5 w-5 cursor-nwse-resize items-center justify-center text-muted-foreground/40 transition hover:text-muted-foreground"
                {...resizeHandleProps}
              >
                <GripVertical className="h-3 w-3 rotate-[-45deg]" />
              </div>
            )}
          </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    )
  },
)
DialogContent.displayName = "DraggableDialogContent"

// ── DialogHeader (auto-wired as drag handle) ────────────────────────────

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Content rendered after the title area (e.g. section title, description) */
  headerRight?: React.ReactNode
  /** Fixed width for the title (left) column — use to align with a sidebar below */
  titleWidth?: number | string
}

const DialogHeader = ({
  className,
  headerRight,
  titleWidth,
  children,
  ...props
}: DialogHeaderProps) => {
  const ctx = React.useContext(DraggableDialogContext)

  return (
    <div
      className={cn(
        "flex items-start space-x-1.5 gap-6 px-6 pt-6 pb-2 text-left select-none",
        ctx && !ctx.isDragging && "cursor-grab",
        ctx?.isDragging && "cursor-grabbing",
        className,
      )}
      style={ctx ? { touchAction: "none" } : undefined}
      {...(ctx?.dragHandleProps ?? {})}
      {...props}
    >
      <div
        className="flex shrink-0 flex-col space-y-1.5"
        style={titleWidth != null ? { width: titleWidth } : undefined}
      >
        {children}
      </div>
      {headerRight && (
        <div className="flex min-w-0 flex-col space-y-0.5 text-left">
          {headerRight}
        </div>
      )}
    </div>
  )
}
DialogHeader.displayName = "DialogHeader"

// ── DialogBody (optional scrollable content area) ───────────────────────

const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex-1 overflow-y-auto px-6 py-2 gap-8 sm:gap-2 pt-4 space-y-6", className)}
    data-no-drag
    {...props}
  />
)
DialogBody.displayName = "DialogBody"

// ── DialogFooter ────────────────────────────────────────────────────────

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse px-6 pb-6 pt-2 sm:flex-row sm:justify-end sm:space-x-2",
      className,
    )}
    data-no-drag
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

// ── DialogTitle ─────────────────────────────────────────────────────────

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

// ── DialogDescription ───────────────────────────────────────────────────

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

export type { DraggableDialogContentProps }
