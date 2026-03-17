import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useAtomValue, useSetAtom } from "jotai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { JotaiProvider } from "@/components/jotai-provider"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { OpenDocumentLink } from "@/components/open-document-link"
import { OpenDocumentTracker } from "@/components/open-document-tracker"
import { SidebarOpenDocuments } from "@/components/sidebar-open-documents"
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar"
import {
  notificationsAtom,
  type UiNotification,
} from "@/lib/stores/notifications"
import { openDocumentsAtom } from "@/lib/stores/open-documents"

const pathnameMock = vi.fn()
const pushMock = vi.fn()

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...props
  }: React.ComponentProps<"a"> & { href?: string }) => (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event)
        event.preventDefault()
      }}
    >
      {children}
    </a>
  ),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({
    push: pushMock,
  }),
}))

function NotificationSeed({
  notifications,
}: {
  notifications: UiNotification[]
}) {
  const setNotifications = useSetAtom(notificationsAtom)

  React.useEffect(() => {
    setNotifications(notifications)
  }, [notifications, setNotifications])

  return null
}

function OpenDocumentsProbe() {
  const documents = useAtomValue(openDocumentsAtom)

  return <div data-testid="open-documents-json">{JSON.stringify(documents)}</div>
}

describe("Epic 2 shell features", () => {
  beforeEach(() => {
    pathnameMock.mockReset()
    pushMock.mockReset()
    pathnameMock.mockReturnValue("/documents/42")
  })

  it("renders the unread notification count from the shared store", async () => {
    render(
      <JotaiProvider>
        <NotificationSeed
          notifications={[
            {
              kind: "document-consumed",
              level: "success",
              createdAt: "2026-03-16T10:00:00.000Z",
              id: "one",
              message: "invoice.pdf",
              read: false,
              source: "realtime",
              title: "Document consumed",
            },
            {
              createdAt: "2026-03-16T10:05:00.000Z",
              id: "two",
              kind: "document-updated",
              level: "info",
              message: "Document #22 was updated.",
              read: true,
              source: "realtime",
              title: "Document updated",
            },
          ]}
        />
        <NotificationCenter />
      </JotaiProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument()
    })
  })

  it("tracks the current document and exposes it in the sidebar list", async () => {
    render(
      <JotaiProvider>
        <OpenDocumentTracker
          documentId={42}
          href="/documents/42"
          title="Quarterly report"
        />
        <OpenDocumentsProbe />
        <SidebarProvider>
          <Sidebar>
            <SidebarOpenDocuments />
          </Sidebar>
        </SidebarProvider>
      </JotaiProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("open-documents-json")).toHaveTextContent(
        "Quarterly report"
      )
    })

    expect(screen.getByText("Open Documents")).toBeInTheDocument()
    expect(screen.getByText("Quarterly report")).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText("Close Quarterly report"))

    await waitFor(() => {
      expect(screen.queryByText("Quarterly report")).not.toBeInTheDocument()
    })
    expect(pushMock).toHaveBeenCalledWith("/documents")
  })

  it("tracks document links when users open a document outside the detail page", async () => {
    render(
      <JotaiProvider>
        <OpenDocumentsProbe />
        <OpenDocumentLink documentId={12} title="Invoice 12">
          Open invoice
        </OpenDocumentLink>
      </JotaiProvider>
    )

    fireEvent.click(screen.getByText("Open invoice"))

    await waitFor(() => {
      expect(screen.getByTestId("open-documents-json")).toHaveTextContent(
        "Invoice 12"
      )
    })
  })
})
