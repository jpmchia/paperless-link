import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DocumentChat } from "@/components/documents/document-chat"

const toastErrorMock = vi.fn()

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}))

function createStreamingResponse(chunks: string[]) {
  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => {
          controller.enqueue(encoder.encode(chunk))
        })
        controller.close()
      },
    }),
    {
      headers: { "Content-Type": "text/event-stream; charset=utf-8" },
    }
  )
}

describe("DocumentChat", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("streams assistant text and resolves trailing references", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createStreamingResponse([
          "The document says hello",
          "\n\n__PAPERLESS_CHAT_METADATA__",
          '{"references":[{"id":9,"title":"Invoice 9"}]}',
        ])
      )
    )

    render(<DocumentChat documentId={9} documentTitle="Invoice 9" />)

    fireEvent.change(screen.getByLabelText("Ask about this document"), {
      target: { value: "What does this document say?" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Ask" }))

    expect(await screen.findByText("The document says hello")).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: "Reference Invoice 9" })
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/__PAPERLESS_CHAT_METADATA__/)
    ).not.toBeInTheDocument()
  })

  it("shows a request failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Forbidden", {
          status: 403,
          headers: { "Content-Type": "text/plain" },
        })
      )
    )

    render(<DocumentChat documentId={9} />)

    fireEvent.change(screen.getByLabelText("Ask about this document"), {
      target: { value: "What does this document say?" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Ask" }))

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled()
    })
  })
})
