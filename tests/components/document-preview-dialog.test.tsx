import type { ReactNode } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DocumentPreviewDialog } from "@/app/documents/document-preview-dialog"

vi.mock("@/components/open-document-link", () => ({
  OpenDocumentLink: ({
    children,
    href,
  }: {
    children: ReactNode
    href?: string
  }) => <a href={href}>{children}</a>,
}))

describe("DocumentPreviewDialog", () => {
  it("navigates between documents using the current list order", () => {
    const onDocumentChange = vi.fn()

    render(
      <DocumentPreviewDialog
        documentId={2}
        documentTitle="Second"
        documents={[
          { id: 1, title: "First" },
          { id: 2, title: "Second" },
          { id: 3, title: "Third" },
        ]}
        onClose={vi.fn()}
        onDocumentChange={onDocumentChange}
      />
    )

    fireEvent.click(screen.getAllByRole("button")[0])
    fireEvent.click(screen.getAllByRole("button")[1])

    expect(onDocumentChange).toHaveBeenNthCalledWith(1, { id: 1, title: "First" })
    expect(onDocumentChange).toHaveBeenNthCalledWith(2, { id: 3, title: "Third" })
    expect(screen.getByText("2 of 3")).toBeInTheDocument()
  })
})
