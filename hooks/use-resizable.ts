"use client"

/**
 * useResizable -- Pointer-captured resize with direct DOM size mutation.
 *
 * Follows the same architecture as useDraggable (see that file for the full
 * rationale and the Firefox compositing bug documentation).
 *
 * Key points:
 *   - All 4 pointer handlers are returned as stable React event props.
 *   - setPointerCapture() on the resize handle guarantees event delivery.
 *   - containerRef.current.style.width/height are mutated directly during
 *     resize for 60fps responsiveness.
 *   - React state is updated only at resize end for persistence.
 *   - For docked panels, deltaX/deltaY are inverted when the resize edge
 *     is on the opposite side (right dock resizes from the left edge, etc.).
 */

import { useState, useRef, useCallback, useEffect } from "react"

type Size = { width: number; height: number }
type ResizeDirection = "horizontal" | "vertical" | "both"

type DockSide = "left" | "right" | "top" | "bottom" | null

type UseResizableOptions = {
  initialSize: Size
  containerRef: React.RefObject<HTMLDivElement | null>
  direction?: ResizeDirection
  dockSide?: DockSide
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  onResizeStart?: () => void
  onResize?: (size: Size) => void
  onResizeEnd?: (size: Size) => void
  enabled?: boolean
}

type UseResizableReturn = {
  size: Size
  setSize: (size: Size) => void
  isResizing: boolean
  resizeHandleProps: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
    style: React.CSSProperties
    role: string
    "aria-hidden": boolean
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(min, value), max)
}

function clampToViewport(
  size: Size,
  minW: number,
  maxW: number,
  minH: number,
  maxH: number,
  edgeMargin = 32,
): Size {
  const vpW = typeof window !== "undefined" ? window.innerWidth : 1920
  const vpH = typeof window !== "undefined" ? window.innerHeight : 1080
  const effectiveMaxW = Math.min(maxW, vpW - edgeMargin * 2)
  const effectiveMaxH = Math.min(maxH, vpH - edgeMargin * 2)

  return {
    width: clamp(size.width, minW, effectiveMaxW),
    height: clamp(size.height, minH, effectiveMaxH),
  }
}

const CURSOR_MAP: Record<ResizeDirection, string> = {
  horizontal: "ew-resize",
  vertical: "ns-resize",
  both: "nwse-resize",
}

export function useResizable(options: UseResizableOptions): UseResizableReturn {
  const {
    initialSize,
    containerRef,
    direction = "both",
    dockSide = null,
    minWidth = 280,
    maxWidth = 1200,
    minHeight = 200,
    maxHeight = 1200,
    onResizeStart,
    onResize,
    onResizeEnd,
    enabled = true,
  } = options

  const [size, setSizeState] = useState<Size>(initialSize)
  const [isResizing, setIsResizing] = useState(false)

  const sizeRef = useRef(size)
  const optionsRef = useRef({ direction, dockSide, minWidth, maxWidth, minHeight, maxHeight, onResizeStart, onResize, onResizeEnd })

  const pointerIdRef = useRef<number | null>(null)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const startSizeRef = useRef<Size>({ width: 0, height: 0 })

  useEffect(() => {
    sizeRef.current = size
  }, [size])

  useEffect(() => {
    optionsRef.current = {
      direction,
      dockSide,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
      onResizeStart,
      onResize,
      onResizeEnd,
    }
  }, [
    direction,
    dockSide,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    onResizeStart,
    onResize,
    onResizeEnd,
  ])

  const setSize = useCallback((s: Size) => {
    sizeRef.current = s
    setSizeState(s)
  }, [])

  // Direct DOM mutation -- bypasses React's render cycle for 60fps resize.
  const updateContainerSize = useCallback((s: Size) => {
    const el = containerRef.current
    if (el) {
      if (optionsRef.current.direction !== "vertical") {
        el.style.width = `${s.width}px`
      }
      if (optionsRef.current.direction !== "horizontal") {
        el.style.height = `${s.height}px`
      }
    }
  }, [containerRef])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return

      e.stopPropagation()
      e.preventDefault()

      pointerIdRef.current = e.pointerId
      startXRef.current = e.clientX
      startYRef.current = e.clientY
      startSizeRef.current = { ...sizeRef.current }

      setIsResizing(true)
      optionsRef.current.onResizeStart?.()

      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)
    },
    [enabled],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return
      e.preventDefault()

      const { direction: dir, dockSide: side, minWidth: mnW, maxWidth: mxW, minHeight: mnH, maxHeight: mxH } =
        optionsRef.current
      const rawDeltaX = e.clientX - startXRef.current
      const rawDeltaY = e.clientY - startYRef.current

      // Invert deltas for right/bottom docks: the resize handle is on
      // the opposite edge, so dragging "outward" must increase size.
      const deltaX = side === "right" ? -rawDeltaX : rawDeltaX
      const deltaY = side === "bottom" ? -rawDeltaY : rawDeltaY

      const rawSize: Size = {
        width: dir === "vertical" ? startSizeRef.current.width : startSizeRef.current.width + deltaX,
        height: dir === "horizontal" ? startSizeRef.current.height : startSizeRef.current.height + deltaY,
      }

      const clamped = clampToViewport(rawSize, mnW, mxW, mnH, mxH)
      sizeRef.current = clamped
      updateContainerSize(clamped)
      optionsRef.current.onResize?.(clamped)
    },
    [updateContainerSize],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return

      const target = e.currentTarget as HTMLElement
      if (target.hasPointerCapture(pointerIdRef.current)) {
        target.releasePointerCapture(pointerIdRef.current)
      }

      pointerIdRef.current = null
      setIsResizing(false)
      setSizeState(sizeRef.current)
      optionsRef.current.onResizeEnd?.(sizeRef.current)
    },
    [],
  )

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return

      const target = e.currentTarget as HTMLElement
      if (target.hasPointerCapture(pointerIdRef.current)) {
        target.releasePointerCapture(pointerIdRef.current)
      }

      pointerIdRef.current = null
      setIsResizing(false)
      setSizeState(sizeRef.current)
      optionsRef.current.onResizeEnd?.(sizeRef.current)
    },
    [],
  )

  return {
    size,
    setSize,
    isResizing,
    resizeHandleProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      style: {
        cursor: CURSOR_MAP[direction],
        touchAction: "none",
        userSelect: "none" as const,
      },
      role: "presentation",
      "aria-hidden": true as const,
    },
  }
}
