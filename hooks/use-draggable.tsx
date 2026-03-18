"use client"

/**
 * useDraggable -- Pointer-captured drag with direct DOM transform mutation.
 *
 * Architecture modelled on CopilotKit's Lit web inspector component, adapted
 * for React. The Lit component works because:
 *   1. All 4 pointer handlers are PERMANENT listeners on the element template.
 *   2. setPointerCapture() guarantees the browser routes all subsequent pointer
 *      events to the captured element (W3C Pointer Events spec).
 *   3. Position is applied via direct DOM mutation (this.style.transform),
 *      completely outside Lit's rendering cycle.
 *
 * This hook replicates that pattern in React:
 *   - Returns all 4 handlers (onPointerDown/Move/Up/Cancel) as stable React
 *     event props, spread onto the drag handle element.
 *   - Uses setPointerCapture() so the browser itself guarantees event delivery
 *     regardless of what else happens in the DOM or React tree.
 *   - Mutates panelRef.current.style.transform directly during drag, bypassing
 *     React's render cycle for 60fps movement.
 *   - React state (isDragging, position) is updated only at drag BOUNDARIES
 *     (once at threshold, once at end), never per-frame.
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  FIREFOX COMPOSITING BUG -- READ BEFORE MODIFYING                  ║
 * ║                                                                    ║
 * ║  The setIsDragging(true) call at the drag threshold triggers ONE   ║
 * ║  React re-render. This re-render is safe ONLY because:             ║
 * ║                                                                    ║
 * ║  1. The consumer's style object is memoised with useMemo so React  ║
 * ║     sees the same reference and SKIPS the style diff entirely.     ║
 * ║     If panelStyle is recreated each render, React will re-apply    ║
 * ║     every CSS property, which in Firefox forces a compositing      ║
 * ║     rebuild when combined with backdrop-filter on a child -- the   ║
 * ║     panel visually disappears for one frame.                       ║
 * ║                                                                    ║
 * ║  2. The CSS must NOT add will-change: transform to .dockable-panel ║
 * ║     -- translate3d() already promotes to a GPU layer. Redundant    ║
 * ║     will-change creates a permanent compositor layer that Firefox  ║
 * ║     mishandles when backdrop-filter: blur() exists on a child.     ║
 * ║                                                                    ║
 * ║  3. The CSS must NOT add filter or box-shadow to                   ║
 * ║     .dockable-panel[data-dragging="true"]. Dynamically adding      ║
 * ║     compositing-affecting properties at drag start forces Firefox  ║
 * ║     to rebuild the compositing tree, causing a visual flash.       ║
 * ║                                                                    ║
 * ║  These three constraints are load-bearing. Violating any one of    ║
 * ║  them causes panels to flicker/vanish during drag in Firefox.      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react"

const DRAG_THRESHOLD = 6
const EDGE_MARGIN = 0

type Position = { x: number; y: number }

type Insets = { left: number; right: number; top: number; bottom: number }

type UseDraggableOptions = {
  enabled?: boolean
  initialPosition?: Position
  panelRef: React.RefObject<HTMLDivElement | null>
  onDragStart?: () => void
  onDragMove?: (position: Position, pointer: Position) => void
  onDragEnd?: (position: Position) => void
  constrainToViewport?: boolean
  elementSize?: { width: number; height: number }
  edgeMargin?: number
  constrainInsets?: () => Insets
  /** When set by consumer (e.g. after undocking from toolbar), next pointer move with button down starts drag at this position so the same gesture continues. */
  externalDragStartRef?: React.MutableRefObject<{ clientX: number; clientY: number } | null>
}

type UseDraggableReturn = {
  position: Position
  setPosition: (pos: Position) => void
  isDragging: boolean
  dragHandleProps: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(min, value), max)
}

function constrainPosition(
  pos: Position,
  size: { width: number; height: number },
  margin: number,
  insets?: Insets,
): Position {
  if (typeof window === "undefined") return pos

  const l = insets?.left ?? 0
  const r = insets?.right ?? 0
  const t = insets?.top ?? 0
  const b = insets?.bottom ?? 0

  const minX = l + margin
  const minY = t + margin
  const maxX = Math.max(minX, window.innerWidth - r - margin - size.width)
  const maxY = Math.max(minY, window.innerHeight - b - margin - size.height)

  return {
    x: clamp(pos.x, minX, maxX),
    y: clamp(pos.y, minY, maxY),
  }
}

export function useDraggable(options: UseDraggableOptions): UseDraggableReturn {
  const {
    enabled = true,
    initialPosition = { x: 0, y: 0 },
    panelRef,
    onDragStart,
    onDragMove,
    onDragEnd,
    constrainToViewport: shouldConstrain = true,
    elementSize = { width: 400, height: 300 },
    edgeMargin = EDGE_MARGIN,
    constrainInsets,
    externalDragStartRef,
  } = options

  const [position, setPositionState] = useState<Position>(initialPosition)
  const [isDragging, setIsDragging] = useState(false)

  const positionRef = useRef(position)
  const elementSizeRef = useRef(elementSize)
  const constrainInsetsRef = useRef(constrainInsets)
  const optionsRef = useRef({ onDragStart, onDragMove, onDragEnd, shouldConstrain, edgeMargin })
  const enabledRef = useRef(enabled)

  const pointerIdRef = useRef<number | null>(null)
  const dragStartRef = useRef<Position | null>(null)
  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const hasDraggedRef = useRef(false)

  positionRef.current = position
  elementSizeRef.current = elementSize
  enabledRef.current = enabled
  constrainInsetsRef.current = constrainInsets
  optionsRef.current = { onDragStart, onDragMove, onDragEnd, shouldConstrain, edgeMargin }

  const setPosition = useCallback((pos: Position) => {
    positionRef.current = pos
    setPositionState(pos)
  }, [])

  // Sync with external position changes (e.g. localStorage hydration)
  const prevInitialRef = useRef(initialPosition)
  useEffect(() => {
    if (
      !isDraggingRef.current &&
      (prevInitialRef.current.x !== initialPosition.x ||
        prevInitialRef.current.y !== initialPosition.y)
    ) {
      prevInitialRef.current = initialPosition
      positionRef.current = initialPosition
      setPositionState(initialPosition)
    }
  }, [initialPosition])

  // Direct DOM mutation -- bypasses React's render cycle for 60fps drag.
  // translate3d forces GPU compositing without needing will-change.
  const applyTransform = useCallback((pos: Position) => {
    const el = panelRef.current
    if (el) {
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
    }
  }, [panelRef])

  // Apply transform from React state only when NOT actively dragging.
  // During drag, handlePointerMove calls applyTransform directly.
  // useLayoutEffect ensures the transform is applied BEFORE the browser
  // paints, preventing a flash at (0,0) on first mount.
  useLayoutEffect(() => {
    if (enabled && !isDraggingRef.current) {
      applyTransform(position)
    }
  }, [position, enabled, applyTransform])

  // Clear stale transform when docking (enabled → false) so the panel
  // is positioned purely by CSS fixed positioning, not a leftover translate.
  useEffect(() => {
    if (!enabled) {
      const el = panelRef.current
      if (el) el.style.transform = ""
    }
  }, [enabled, panelRef])

  const resetPointerTracking = useCallback(() => {
    pointerIdRef.current = null
    dragStartRef.current = null
    isDraggingRef.current = false
    hasDraggedRef.current = false
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabledRef.current) return

      const eventTarget = e.target as HTMLElement | null
      if (eventTarget?.closest("button, input, select, textarea, [data-no-drag]")) {
        return
      }

      e.preventDefault()

      pointerIdRef.current = e.pointerId
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      dragOffsetRef.current = {
        x: e.clientX - positionRef.current.x,
        y: e.clientY - positionRef.current.y,
      }
      isDraggingRef.current = false
      hasDraggedRef.current = false

      // setPointerCapture guarantees the browser delivers ALL subsequent
      // pointer events for this pointerId to this element, even if the
      // pointer leaves the element or window. This is the W3C standard
      // mechanism and works identically across Chrome, Firefox, and Safari.
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)
    },
    [],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Continue drag from toolbar undock: same pointer gesture that undocked
      // didn't go through our pointer down; inject drag start on first move.
      if (
        externalDragStartRef?.current != null &&
        e.buttons === 1 &&
        enabledRef.current
      ) {
        const { clientX, clientY } = externalDragStartRef.current
        externalDragStartRef.current = null
        pointerIdRef.current = e.pointerId
        dragStartRef.current = { x: clientX, y: clientY }
        dragOffsetRef.current = {
          x: clientX - positionRef.current.x,
          y: clientY - positionRef.current.y,
        }
        hasDraggedRef.current = true
        isDraggingRef.current = true
        setIsDragging(true)
        optionsRef.current.onDragStart?.()
        const target = e.currentTarget as HTMLElement
        target.setPointerCapture(e.pointerId)
        e.preventDefault()
        let desired: Position = {
          x: e.clientX - dragOffsetRef.current.x,
          y: e.clientY - dragOffsetRef.current.y,
        }
        if (optionsRef.current.shouldConstrain) {
          const insets = constrainInsetsRef.current?.()
          desired = constrainPosition(desired, elementSizeRef.current, optionsRef.current.edgeMargin, insets)
        }
        positionRef.current = desired
        applyTransform(desired)
        optionsRef.current.onDragMove?.(desired, { x: e.clientX, y: e.clientY })
        return
      }

      if (
        pointerIdRef.current !== e.pointerId ||
        !dragStartRef.current
      ) {
        return
      }

      const distance = Math.hypot(
        e.clientX - dragStartRef.current.x,
        e.clientY - dragStartRef.current.y,
      )
      if (!isDraggingRef.current && distance < DRAG_THRESHOLD) {
        return
      }

      if (!isDraggingRef.current) {
        isDraggingRef.current = true
        hasDraggedRef.current = true
        // This is the ONLY React state update during drag. It triggers one
        // re-render to update data-dragging and cursor classes. This is safe
        // because panelStyle is memoised (see Firefox bug note at top of file).
        setIsDragging(true)
        optionsRef.current.onDragStart?.()
      }

      e.preventDefault()

      let desired: Position = {
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      }

      if (optionsRef.current.shouldConstrain) {
        const insets = constrainInsetsRef.current?.()
        desired = constrainPosition(desired, elementSizeRef.current, optionsRef.current.edgeMargin, insets)
      }

      positionRef.current = desired
      applyTransform(desired)
      optionsRef.current.onDragMove?.(desired, { x: e.clientX, y: e.clientY })
    },
    [applyTransform, externalDragStartRef],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return

      const target = e.currentTarget as HTMLElement
      if (target.hasPointerCapture(pointerIdRef.current)) {
        target.releasePointerCapture(pointerIdRef.current)
      }

      if (isDraggingRef.current) {
        e.preventDefault()
        setIsDragging(false)
        setPositionState(positionRef.current)
        optionsRef.current.onDragEnd?.(positionRef.current)
      }

      resetPointerTracking()
    },
    [resetPointerTracking],
  )

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return

      const target = e.currentTarget as HTMLElement
      if (target.hasPointerCapture(pointerIdRef.current)) {
        target.releasePointerCapture(pointerIdRef.current)
      }

      if (isDraggingRef.current) {
        setIsDragging(false)
        setPositionState(positionRef.current)
      }

      resetPointerTracking()
    },
    [resetPointerTracking],
  )

  return {
    position,
    setPosition,
    isDragging,
    dragHandleProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  }
}
