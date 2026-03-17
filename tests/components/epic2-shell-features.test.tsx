import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useAtomValue, useSetAtom } from "jotai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { JotaiProvider } from "@/components/jotai-provider"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { OpenDocumentTracker } from "@/components/open-document-tracker"
import { SidebarOpenDocuments } from "@/components/sidebar-open-documents"
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar"
import {
  notificationsAtom,
  type UiNotification,
} from "@/lib/stores/notifications"
import { openDocumentsAtom } from "@/lib/stores/open-documents"

const pathnameMock = vi.fn()

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
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
    pathnameMock.mockReturnValue("/documents/42")
  })

  it("renders the unread notification count from the shared store", async () => {
    render(
      <JotaiProvider>
        <NotificationSeed
          notifications={[
            {
              createdAt: "2026-03-16T10:00:00.000Z",
              id: "one",
              message: "invoice.pdf",
              source: "realtime",
              title: "Document consumed",
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
  })
})
