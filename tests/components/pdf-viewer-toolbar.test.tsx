import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PdfViewerToolbar } from "@/components/documents/pdf-viewer-toolbar"

describe("PdfViewerToolbar", () => {
  it("opens search and forwards search navigation controls", () => {
    const onOpenSearch = vi.fn()
    const onQueryChange = vi.fn()
    const onNext = vi.fn()
    const onPrevious = vi.fn()
    const onClear = vi.fn()
    const onFullscreen = vi.fn()

    const { rerender } = render(
      <PdfViewerToolbar
        searchOpen={false}
        query=""
        currentResult={0}
        totalResults={0}
        onOpenSearch={onOpenSearch}
        onCloseSearch={vi.fn()}
        onQueryChange={onQueryChange}
        onNext={onNext}
        onPrevious={onPrevious}
        onClear={onClear}
        onFullscreen={onFullscreen}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Search PDF" }))
    expect(onOpenSearch).toHaveBeenCalledOnce()

    rerender(
      <PdfViewerToolbar
        searchOpen
        query="invoice"
        currentResult={2}
        totalResults={4}
        onOpenSearch={onOpenSearch}
        onCloseSearch={vi.fn()}
        onQueryChange={onQueryChange}
        onNext={onNext}
        onPrevious={onPrevious}
        onClear={onClear}
        onFullscreen={onFullscreen}
      />
    )

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "receipt" } })
    fireEvent.click(screen.getByRole("button", { name: "Previous result" }))
    fireEvent.click(screen.getByRole("button", { name: "Next result" }))
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }))
    fireEvent.click(screen.getByRole("button", { name: "Enter fullscreen" }))

    expect(onQueryChange).toHaveBeenCalledWith("receipt")
    expect(onPrevious).toHaveBeenCalledOnce()
    expect(onNext).toHaveBeenCalledOnce()
    expect(onClear).toHaveBeenCalledOnce()
    expect(onFullscreen).toHaveBeenCalledOnce()
    expect(screen.getByText("2 / 4")).toBeInTheDocument()
  })
})
