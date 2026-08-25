import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BulkDownloadDialog } from "@/components/documents/bulk-download-dialog"
import { createExplicitDocumentSelection } from "@/lib/document-selection"

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}))

describe("BulkDownloadDialog", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:bulk-download"),
    })
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  })

  it("posts the selected content and follow_formatting flag", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response("zip", {
          status: 200,
          headers: {
            "Content-Disposition": 'attachment; filename="bulk.zip"',
          },
        })
      )
    const onOpenChange = vi.fn()

    render(
      <BulkDownloadDialog
        open
        onOpenChange={onOpenChange}
        selection={createExplicitDocumentSelection([8, 9])}
        selectedCount={2}
      />
    )

    expect(screen.getByText("Download 2 selected documents as a ZIP file.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("checkbox", { name: "Archive PDF" }))
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Use formatted filenames" })
    )
    fireEvent.click(screen.getByRole("button", { name: "Download ZIP" }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bulk-download",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          documents: [8, 9],
          content: "originals",
          follow_formatting: true,
        }),
      })
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(toastSuccess).toHaveBeenCalledWith("Download started")
  })

  it("validates empty content selection and resets when reopened", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("zip", { status: 200 }))
    const onOpenChange = vi.fn()
    const selection = createExplicitDocumentSelection([12])
    const { rerender } = render(
      <BulkDownloadDialog
        open
        onOpenChange={onOpenChange}
        selection={selection}
        selectedCount={1}
      />
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "Archive PDF" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Original files" }))
    fireEvent.click(screen.getByRole("button", { name: "Download ZIP" }))

    expect(await screen.findByText("Select at least one file type to download.")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    rerender(
      <BulkDownloadDialog
        open={false}
        onOpenChange={onOpenChange}
        selection={selection}
        selectedCount={1}
      />
    )
    rerender(
      <BulkDownloadDialog
        open
        onOpenChange={onOpenChange}
        selection={selection}
        selectedCount={1}
      />
    )

    await waitFor(() => {
      expect(
        screen.queryByText("Select at least one file type to download.")
      ).not.toBeInTheDocument()
    })
    expect(screen.getByRole("checkbox", { name: "Archive PDF" })).toHaveAttribute(
      "data-state",
      "checked"
    )
    expect(
      screen.getByRole("checkbox", { name: "Original files" })
    ).toHaveAttribute("data-state", "checked")
    expect(
      screen.getByRole("checkbox", { name: "Use formatted filenames" })
    ).toHaveAttribute("data-state", "unchecked")
  })
})
