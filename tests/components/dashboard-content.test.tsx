import * as React from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
import { useSetAtom } from "jotai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  DashboardContent,
  type DashboardData,
} from "@/app/dashboard/dashboard-content"
import { defaultUserPreferences } from "@/lib/user-preferences"
import { JotaiProvider } from "@/components/jotai-provider"
import { UserPreferencesProvider } from "@/components/user-preferences-provider"
import type { RealtimeEvent } from "@/lib/realtime/events"
import {
  latestRealtimeEventAtom,
  realtimeConnectionAtom,
} from "@/lib/stores/realtime"

const getJsonMock = vi.fn()
const updateUiSettingsMock = vi.fn()
const toastErrorMock = vi.fn()

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}))

vi.mock("@/app/actions/ui-settings", () => ({
  updateUiSettings: (...args: unknown[]) => updateUiSettingsMock(...args),
}))

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

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode
    onDragEnd?: (event: {
      active: { id: number }
      over: { id: number }
    }) => void
  }) => (
    <div>
      <button
        type="button"
        onClick={() => onDragEnd?.({ active: { id: 2 }, over: { id: 1 } })}
      >
        Trigger reorder
      </button>
      {children}
    </div>
  ),
  KeyboardSensor: class {},
  PointerSensor: class {},
  closestCenter: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}))

vi.mock("@dnd-kit/sortable", () => ({
  arrayMove: <T,>(items: T[], oldIndex: number, newIndex: number) => {
    const next = [...items]
    const [item] = next.splice(oldIndex, 1)
    next.splice(newIndex, 0, item)
    return next
  },
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
  verticalListSortingStrategy: {},
}))

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
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
  savedViews: [
    { id: 1, name: "Inbox", show_in_sidebar: true, show_on_dashboard: true },
    {
      id: 2,
      name: "Needs review",
      show_in_sidebar: false,
      show_on_dashboard: true,
    },
  ],
  savedViewWidgets: [
    {
      count: 3,
      documents: [
        {
          correspondent: 1,
          created: "2026-03-17T10:00:00Z",
          document_type: 2,
          id: 101,
          title: "Initial widget document",
        },
      ],
      error: null,
      view: {
        id: 1,
        name: "Inbox",
        show_in_sidebar: true,
        show_on_dashboard: true,
      },
    },
    {
      count: 1,
      documents: [],
      error: null,
      view: {
        id: 2,
        name: "Needs review",
        show_in_sidebar: false,
        show_on_dashboard: true,
      },
    },
  ],
  statistics: {
    documents_inbox: 1,
    documents_total: 3,
  },
}

function renderDashboard(data: DashboardData = initialData) {
  return render(
    <JotaiProvider>
      <UserPreferencesProvider value={defaultUserPreferences}>
        <RealtimeControls />
        <DashboardContent initialData={data} />
      </UserPreferencesProvider>
    </JotaiProvider>
  )
}

function expectLinkBefore(leftLabel: string, rightLabel: string) {
  const leftNode = screen.getByRole("link", { name: leftLabel })
  const rightNode = screen.getByRole("link", { name: rightLabel })
  expect(
    leftNode.compareDocumentPosition(rightNode) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy()
}

describe("DashboardContent", () => {
  beforeEach(() => {
    getJsonMock.mockReset()
    updateUiSettingsMock.mockReset()
    toastErrorMock.mockReset()
  })

  it("renders dashboard saved-view widgets with document previews", () => {
    renderDashboard()

    expect(screen.getByText("Initial widget document")).toBeInTheDocument()
    expect(screen.getByText("3 total")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "View all Inbox documents" })
    ).toHaveAttribute("href", "/view/1")
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
      savedViews: initialData.savedViews,
      savedViewWidgets: [
        {
          count: 4,
          documents: [
            {
              correspondent: 1,
              created: "2026-03-17T11:00:00Z",
              document_type: 2,
              id: 201,
              title: "Realtime widget document",
            },
          ],
          error: null,
          view: {
            id: 1,
            name: "Inbox",
            show_in_sidebar: true,
            show_on_dashboard: true,
          },
        },
      ],
      statistics: {
        documents_inbox: 2,
        documents_total: 4,
      },
    })

    renderDashboard()

    expect(screen.getByText("Initial document")).toBeInTheDocument()
    expect(screen.getByText("Initial widget document")).toBeInTheDocument()

    await act(async () => {
      screen.getByText("Push Event").click()
    })

    await waitFor(() => {
      expect(getJsonMock).toHaveBeenCalledWith("/api/dashboard")
      expect(screen.getByText("Realtime widget document")).toBeInTheDocument()
      expect(screen.getByText("4 total")).toBeInTheDocument()
    })
  })

  it("refreshes dashboard widgets when realtime reconnects", async () => {
    getJsonMock.mockResolvedValue(initialData)

    renderDashboard()

    await act(async () => {
      screen.getByText("Connect").click()
    })

    await waitFor(() => {
      expect(getJsonMock).toHaveBeenCalledWith("/api/dashboard")
    })
  })

  it("persists dashboard widget order optimistically", async () => {
    updateUiSettingsMock.mockResolvedValue({})

    renderDashboard()

    expectLinkBefore(
      "View all Inbox documents",
      "View all Needs review documents"
    )

    await act(async () => {
      screen.getByText("Trigger reorder").click()
    })

    expectLinkBefore(
      "View all Needs review documents",
      "View all Inbox documents"
    )

    await waitFor(() => {
      expect(updateUiSettingsMock).toHaveBeenCalledWith({
        saved_views: {
          dashboard_views_sort_order: [2, 1],
        },
      })
    })
  })

  it("rolls back dashboard widget order when persistence fails", async () => {
    updateUiSettingsMock.mockRejectedValue(new Error("save failed"))

    renderDashboard()

    await act(async () => {
      screen.getByText("Trigger reorder").click()
    })

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Failed to save dashboard order"
      )
    })

    expectLinkBefore(
      "View all Inbox documents",
      "View all Needs review documents"
    )
  })
})
