import * as React from "react"
import { fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useUnsavedChanges } from "@/lib/use-unsaved-changes"

const confirmMock = vi.fn()
const assignMock = vi.fn()

vi.mock("@/components/confirmation-dialog-provider", () => ({
  ConfirmationDialogProvider: ({ children }: { children: React.ReactNode }) => children,
  useConfirmationDialog: () => ({
    confirm: confirmMock,
  }),
}))

function TestComponent({ dirty }: { dirty: boolean }) {
  useUnsavedChanges(dirty)

  return (
    <div>
      <button type="button">Go to another view</button>
    </div>
  )
}

describe("useUnsavedChanges", () => {
  const pushStateSpy = vi.spyOn(window.history, "pushState")
  const backSpy = vi.spyOn(window.history, "back")

  beforeEach(() => {
    confirmMock.mockReset()
    assignMock.mockReset()
    pushStateSpy.mockClear()
    backSpy.mockClear()
    pushStateSpy.mockImplementation(() => {})
    backSpy.mockImplementation(() => {})
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        assign: assignMock,
        href: "http://localhost/documents?view=1",
      },
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it("restores the sentinel entry when browser back is cancelled", async () => {
    confirmMock.mockResolvedValue(false)

    render(<TestComponent dirty />)
    await Promise.resolve()
    fireEvent.popState(window)

    expect(confirmMock).toHaveBeenCalled()
    await Promise.resolve()
    expect(pushStateSpy).toHaveBeenCalled()
    expect(backSpy).not.toHaveBeenCalled()
  })

  it("disables the native unload prompt after confirmed navigation", async () => {
    confirmMock.mockResolvedValue(true)

    render(<TestComponent dirty />)
    await Promise.resolve()
    fireEvent.popState(window)

    await Promise.resolve()
    expect(backSpy).toHaveBeenCalled()

    const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })
})
