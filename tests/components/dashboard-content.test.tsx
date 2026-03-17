import * as React from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
import { useSetAtom } from "jotai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  DashboardContent,
  type DashboardData,
} from "@/app/dashboard/dashboard-content"
import { JotaiProvider } from "@/components/jotai-provider"
import type { RealtimeEvent } from "@/lib/realtime/events"
import {
  latestRealtimeEventAtom,
  realtimeConnectionAtom,
} from "@/lib/stores/realtime"

const getJsonMock = vi.fn()

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.ComponentProps<"a"> & { href?: string }) => (
    <a {...props} href={href}>
      {children}
    </a>
  ),
}))

vi.mock("@/lib/paperless-client", () => ({
  getJson: (...args: unknown[]) => getJsonMock(...args),
}))

vi.mock("@/app/dashboard/upload-widget", () => ({
  UploadWidget: () => <div>Upload widget</div>,
}))

function RealtimeControls() {
  const setLatestEvent = useSetAtom(latestRealtimeEventAtom)
  const setConnection = useSetAtom(realtimeConnectionAtom)

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setLatestEvent({
            documentId: 42,
            kind: "document-consumed",
          } as RealtimeEvent)
        }
      >
        Push Event
      </button>
      <button type="button" onClick={() => setConnection("connected")}>
        Connect
      </button>
    </>
  )
}

const initialData: DashboardData = {
  correspondents: [{ id: 1, name: "Acme" }],
  documentTypes: [{ id: 2, name: "Invoice" }],
  recentDocuments: [
    {
      correspondent: 1,
      created: "2026-03-17T10:00:00Z",
      document_type: 2,
      id: 10,
      title: "Initial document",
    },
  ],
  savedViews: [{ id: 1, name: "Inbox", show_on_dashboard: true }],
  statistics: {
    documents_inbox: 1,
    documents_total: 3,
  },
}

describe("DashboardContent", () => {
  beforeEach(() => {
    getJsonMock.mockReset()
  })

  it("refreshes dashboard widgets from the backend when a realtime event arrives", async () => {
    getJsonMock.mockResolvedValue({
      correspondents: [{ id: 1, name: "Acme" }],
      documentTypes: [{ id: 2, name: "Invoice" }],
      recentDocuments: [
        {
          correspondent: 1,
          created: "2026-03-17T11:00:00Z",
          document_type: 2,
          id: 11,
          title: "Realtime document",
        },
      ],
      savedViews: [{ id: 1, name: "Inbox", show_on_dashboard: true }],
      statistics: {
        documents_inbox: 2,
        documents_total: 4,
      },
    })

    render(
      <JotaiProvider>
        <RealtimeControls />
        <DashboardContent initialData={initialData} />
      </JotaiProvider>
    )

    expect(screen.getByText("Initial document")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()

    await act(async () => {
      screen.getByText("Push Event").click()
    })

    await waitFor(() => {
      expect(getJsonMock).toHaveBeenCalledWith("/api/dashboard")
      expect(screen.getByText("Realtime document")).toBeInTheDocument()
      expect(screen.getByText("4")).toBeInTheDocument()
    })
  })

  it("refreshes dashboard widgets when realtime reconnects", async () => {
    getJsonMock.mockResolvedValue(initialData)

    render(
      <JotaiProvider>
        <RealtimeControls />
        <DashboardContent initialData={initialData} />
      </JotaiProvider>
    )

    await act(async () => {
      screen.getByText("Connect").click()
    })

    await waitFor(() => {
      expect(getJsonMock).toHaveBeenCalledWith("/api/dashboard")
    })
  })
})
