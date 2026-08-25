import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { EmailDocumentsDialog } from "@/components/documents/email-documents-dialog"

describe("EmailDocumentsDialog", () => {
  it("validates recipients and posts a normalized payload", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }))
    const onOpenChange = vi.fn()

    render(
      <EmailDocumentsDialog
        open
        onOpenChange={onOpenChange}
        documentIds={[8, 8, 9]}
        documentLabel="2 selected documents"
        hasArchiveVersion={false}
      />
    )

    fireEvent.change(screen.getByLabelText("Email address(es)"), {
      target: { value: "bad-address" },
    })
    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Documents" },
    })
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Attached" },
    })
    expect(screen.getByText("Invalid email address: bad-address")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send email" })).toBeDisabled()

    fireEvent.change(screen.getByLabelText("Email address(es)"), {
      target: { value: "one@example.com, ONE@example.com; two@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Send email" }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/proxy/documents/email/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          documents: [8, 9],
          addresses: "one@example.com,two@example.com",
          subject: "Documents",
          message: "Attached",
          use_archive_version: false,
        }),
      })
    )
  })
})
