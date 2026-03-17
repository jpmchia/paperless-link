import * as React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { useSetAtom } from "jotai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NotesTab } from "@/app/documents/[id]/notes-tab"
import { ShareLinksTab } from "@/app/documents/[id]/share-links-tab"
import { VersionsTab } from "@/app/documents/[id]/versions-tab"
import { JotaiProvider } from "@/components/jotai-provider"
import type { RealtimeEvent } from "@/lib/realtime/events"
import { latestRealtimeEventAtom } from "@/lib/stores/realtime"

const fetchMock = vi.fn()

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}))

vi.mock("@/components/permissions/can-create", () => ({
  CanCreate: ({ children, fallback }: React.PropsWithChildren<{ fallback?: React.ReactNode }>) => (
    <>{children ?? fallback}</>
  ),
}))

vi.mock("@/components/permissions/can-delete", () => ({
  CanDelete: ({ children, fallback }: React.PropsWithChildren<{ fallback?: React.ReactNode }>) => (
    <>{children ?? fallback}</>
  ),
}))

vi.mock("@/components/permissions/has-object-permission", () => ({
  HasObjectPermission: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

function RealtimeSeed({
  event,
}: {
  event: RealtimeEvent | null
}) {
  const setLatestEvent = useSetAtom(latestRealtimeEventAtom)

  React.useEffect(() => {
    setLatestEvent(event)
  }, [event, setLatestEvent])

  return null
}

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({
    json: async () => data,
    ok,
    status: ok ? 200 : 500,
    text: async () => "error",
  })
}

describe("document detail subview realtime refresh", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  it("refreshes notes when the current document updates", async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse([
        {
          created: "2026-03-17T12:00:00Z",
          id: 2,
          note: "Updated note",
        },
      ])
    )

    const { rerender } = render(
      <JotaiProvider>
        <RealtimeSeed event={null} />
        <NotesTab
          documentId={42}
          initialNotes={[
            {
              created: "2026-03-17T11:00:00Z",
              id: 1,
              note: "Original note",
            },
          ]}
        />
      </JotaiProvider>
    )

    expect(screen.getByText("Original note")).toBeInTheDocument()

    rerender(
      <JotaiProvider>
        <RealtimeSeed event={{ documentId: 42, kind: "document-updated" }} />
        <NotesTab
          documentId={42}
          initialNotes={[
            {
              created: "2026-03-17T11:00:00Z",
              id: 1,
              note: "Original note",
            },
          ]}
        />
      </JotaiProvider>
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/documents/42/notes")
      expect(screen.getByText("Updated note")).toBeInTheDocument()
    })
  })

  it("refreshes versions when the current document updates", async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({
        versions: [
          {
            added: "2026-03-17T12:00:00Z",
            id: 2,
            is_root: false,
            version_label: "Second version",
          },
        ],
      })
    )

    const { rerender } = render(
      <JotaiProvider>
        <RealtimeSeed event={null} />
        <VersionsTab
          documentId={42}
          initialVersions={[
            {
              added: "2026-03-17T11:00:00Z",
              id: 1,
              is_root: true,
              version_label: "Original version",
            },
          ]}
          permissionedDocument={{ user_can_change: true }}
        />
      </JotaiProvider>
    )

    expect(screen.getByText("Original version")).toBeInTheDocument()

    rerender(
      <JotaiProvider>
        <RealtimeSeed event={{ documentId: 42, kind: "document-updated" }} />
        <VersionsTab
          documentId={42}
          initialVersions={[
            {
              added: "2026-03-17T11:00:00Z",
              id: 1,
              is_root: true,
              version_label: "Original version",
            },
          ]}
          permissionedDocument={{ user_can_change: true }}
        />
      </JotaiProvider>
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/proxy/documents/42/?full_perms=true")
      expect(screen.getByText("Second version")).toBeInTheDocument()
    })
  })

  it("refreshes share links when the current document updates", async () => {
    fetchMock
      .mockImplementationOnce(() =>
        jsonResponse([
          {
            created: "2026-03-17T11:00:00Z",
            document: 42,
            expiration: null,
            id: 1,
            slug: "first-link",
          },
        ])
      )
      .mockImplementationOnce(() =>
        jsonResponse([
          {
            created: "2026-03-17T12:00:00Z",
            document: 42,
            expiration: null,
            id: 2,
            slug: "second-link",
          },
        ])
      )

    const { rerender } = render(
      <JotaiProvider>
        <RealtimeSeed event={null} />
        <ShareLinksTab
          documentId={42}
          paperlessBaseUrl="http://paperless.test"
        />
      </JotaiProvider>
    )

    expect(await screen.findByText(/first-link/)).toBeInTheDocument()

    rerender(
      <JotaiProvider>
        <RealtimeSeed event={{ documentId: 42, kind: "document-updated" }} />
        <ShareLinksTab
          documentId={42}
          paperlessBaseUrl="http://paperless.test"
        />
      </JotaiProvider>
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/proxy/documents/42/share_links/"
      )
      expect(screen.getByText(/second-link/)).toBeInTheDocument()
    })
  })
})
