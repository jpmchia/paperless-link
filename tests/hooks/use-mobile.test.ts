import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useIsMobile } from "@/hooks/use-mobile"

describe("useIsMobile", () => {
  let addEventListenerSpy: ReturnType<typeof vi.fn>
  let removeEventListenerSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    addEventListenerSpy = vi.fn()
    removeEventListenerSpy = vi.fn()

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    })
  })

  it("returns false for desktop width", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("returns true for mobile width", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 375,
    })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("returns true at the boundary (767px)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 767,
    })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("returns false at exactly the breakpoint (768px)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 768,
    })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("registers and cleans up the change listener", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    })
    const { unmount } = renderHook(() => useIsMobile())

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    )

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    )
  })

  it("responds to change events", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    // Simulate a resize to mobile width
    const changeCallback = addEventListenerSpy.mock.calls[0]?.[1]
    if (changeCallback) {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        value: 500,
      })
      act(() => {
        changeCallback()
      })
      expect(result.current).toBe(true)
    }
  })
})
