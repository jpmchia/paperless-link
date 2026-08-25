import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DocumentId } from "@/components/documents/document-id"

const { toastErrorMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
    success: vi.fn(),
  },
}))

describe("DocumentId", () => {
  beforeEach(() => {
    toastErrorMock.mockReset()
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders the document ID and copies it", async () => {
    render(<DocumentId documentId={42} />)

    const button = screen.getByRole("button", { name: "Copy document ID 42" })
    expect(button).toHaveTextContent("ID: 42")

    fireEvent.click(button)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("42")
      expect(
        screen.getByRole("button", { name: "Document ID 42 copied" })
      ).toHaveTextContent("Copied!")
    })
  })

  it("reports clipboard failures accessibly", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
    })

    render(<DocumentId documentId={7} />)
    fireEvent.click(screen.getByRole("button", { name: "Copy document ID 7" }))

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Failed to copy document ID")
    })
    expect(screen.getByRole("button", { name: "Copy document ID 7" })).toBeInTheDocument()
  })
})
