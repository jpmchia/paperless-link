import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("sonner", () => ({
  toast: mockToast,
}))

vi.mock("@/lib/errors", () => ({
  toErrorMessage: (err: unknown) =>
    err instanceof Error ? err.message : "Unknown error",
}))

import { useAsyncAction } from "@/hooks/use-async-action"

describe("useAsyncAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("starts with pending = false", () => {
    const { result } = renderHook(() =>
      useAsyncAction({
        action: async () => "result",
      })
    )
    expect(result.current.pending).toBe(false)
  })

  it("sets pending to true during execution and false after", async () => {
    let resolve!: (value: string) => void
    const promise = new Promise<string>((r) => {
      resolve = r
    })

    const { result } = renderHook(() =>
      useAsyncAction({
        action: async () => promise,
      })
    )

    let runPromise!: Promise<unknown>
    act(() => {
      runPromise = result.current.run()
    })

    expect(result.current.pending).toBe(true)

    await act(async () => {
      resolve("done")
      await runPromise
    })

    expect(result.current.pending).toBe(false)
  })

  it("shows a success toast when successMessage is provided", async () => {
    const { result } = renderHook(() =>
      useAsyncAction({
        action: async () => "ok",
        successMessage: "Saved!",
      })
    )

    await act(async () => {
      await result.current.run()
    })

    expect(mockToast.success).toHaveBeenCalledWith("Saved!")
  })

  it("does not show a success toast when successMessage is omitted", async () => {
    const { result } = renderHook(() =>
      useAsyncAction({
        action: async () => "ok",
      })
    )

    await act(async () => {
      await result.current.run()
    })

    expect(mockToast.success).not.toHaveBeenCalled()
  })

  it("calls onSuccess with the result", async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() =>
      useAsyncAction({
        action: async () => 42,
        onSuccess,
      })
    )

    await act(async () => {
      await result.current.run()
    })

    expect(onSuccess).toHaveBeenCalledWith(42)
  })

  it("shows error toast and calls onError on failure", async () => {
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useAsyncAction({
        action: async () => {
          throw new Error("Network error")
        },
        errorMessage: "Save failed",
        onError,
      })
    )

    await act(async () => {
      await expect(result.current.run()).rejects.toThrow("Network error")
    })

    expect(mockToast.error).toHaveBeenCalledWith("Save failed", {
      description: "Network error",
    })
    expect(onError).toHaveBeenCalled()
  })

  it("uses default error message when none is provided", async () => {
    const { result } = renderHook(() =>
      useAsyncAction({
        action: async () => {
          throw new Error("fail")
        },
      })
    )

    await act(async () => {
      await expect(result.current.run()).rejects.toThrow("fail")
    })

    expect(mockToast.error).toHaveBeenCalledWith(
      "Request failed",
      expect.any(Object)
    )
  })

  it("resets pending to false after an error", async () => {
    const { result } = renderHook(() =>
      useAsyncAction({
        action: async () => {
          throw new Error("oops")
        },
      })
    )

    await act(async () => {
      try {
        await result.current.run()
      } catch {
        // expected
      }
    })

    expect(result.current.pending).toBe(false)
  })

  it("passes arguments through to the action", async () => {
    const action = vi.fn(async (a: number, b: string) => `${a}-${b}`)
    const { result } = renderHook(() =>
      useAsyncAction({ action })
    )

    await act(async () => {
      await result.current.run(5, "hello")
    })

    expect(action).toHaveBeenCalledWith(5, "hello")
  })

  it("returns the action result", async () => {
    const { result } = renderHook(() =>
      useAsyncAction({
        action: async () => "the-result",
      })
    )

    let returned: string | undefined
    await act(async () => {
      returned = await result.current.run()
    })

    expect(returned).toBe("the-result")
  })
})
