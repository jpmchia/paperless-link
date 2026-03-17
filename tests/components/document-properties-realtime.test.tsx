import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useSetAtom } from "jotai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DetailsForm } from "@/app/documents/[id]/details-form"
import { MetadataTab } from "@/app/documents/[id]/metadata-tab"
import { JotaiProvider } from "@/components/jotai-provider"
import type { RealtimeEvent } from "@/lib/realtime/events"
import { latestRealtimeEventAtom } from "@/lib/stores/realtime"

const fetchMock = vi.fn()
type DetailsDocument = React.ComponentProps<typeof DetailsForm>["document"]

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock("@/app/documents/[id]/actions", () => ({
  updateDocument: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
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

describe("document properties and metadata realtime updates", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  it("updates properties when refreshed props arrive and the form is clean", async () => {
    const { rerender } = render(
      <JotaiProvider>
        <DetailsForm
          document={{
            id: 42,
            title: "Original title",
          } as DetailsDocument}
          correspondents={[]}
          customFieldsList={[]}
          documentTypes={[]}
          storagePaths={[]}
          tagsList={[]}
        />
      </JotaiProvider>
    )

    expect(screen.getByDisplayValue("Original title")).toBeInTheDocument()

    rerender(
      <JotaiProvider>
        <DetailsForm
          document={{
            id: 42,
            title: "Realtime title",
          } as DetailsDocument}
          correspondents={[]}
          customFieldsList={[]}
          documentTypes={[]}
          storagePaths={[]}
          tagsList={[]}
        />
      </JotaiProvider>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue("Realtime title")).toBeInTheDocument()
    })
  })

  it("does not overwrite dirty property edits when refreshed props arrive", async () => {
    const { rerender } = render(
      <JotaiProvider>
        <DetailsForm
          document={{
            id: 42,
            title: "Original title",
          } as DetailsDocument}
          correspondents={[]}
          customFieldsList={[]}
          documentTypes={[]}
          storagePaths={[]}
          tagsList={[]}
        />
      </JotaiProvider>
    )

    const titleInput = screen.getByDisplayValue("Original title")
    fireEvent.change(titleInput, {
      target: {
        value: "My unsaved draft",
      },
    })

    rerender(
      <JotaiProvider>
        <DetailsForm
          document={{
            id: 42,
            title: "Remote title",
          } as DetailsDocument}
          correspondents={[]}
          customFieldsList={[]}
          documentTypes={[]}
          storagePaths={[]}
          tagsList={[]}
        />
      </JotaiProvider>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue("My unsaved draft")).toBeInTheDocument()
    })
  })

  it("refreshes metadata live when a realtime document update arrives", async () => {
    fetchMock.mockImplementation(async (input: string) => {
      if (input.includes("/metadata/")) {
        return {
          json: async () => ({
            media_filename: "updated.pdf",
            original_filename: "updated-original.pdf",
          }),
          ok: true,
        }
      }

      return {
        json: async () => ({
          added: "2026-03-16T10:00:00Z",
          id: 42,
          modified: "2026-03-17T10:00:00Z",
        }),
        ok: true,
      }
    })

    const { rerender } = render(
      <JotaiProvider>
        <RealtimeSeed event={null} />
        <MetadataTab
          document={{
            added: "2026-03-15T10:00:00Z",
            id: 42,
            modified: "2026-03-15T10:00:00Z",
          }}
          metadata={{
            media_filename: "original.pdf",
            original_filename: "original-source.pdf",
          }}
        />
      </JotaiProvider>
    )

    expect(screen.getByText("original.pdf")).toBeInTheDocument()

    rerender(
      <JotaiProvider>
        <RealtimeSeed event={{ documentId: 42, kind: "document-updated" }} />
        <MetadataTab
          document={{
            added: "2026-03-15T10:00:00Z",
            id: 42,
            modified: "2026-03-15T10:00:00Z",
          }}
          metadata={{
            media_filename: "original.pdf",
            original_filename: "original-source.pdf",
          }}
        />
      </JotaiProvider>
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/proxy/documents/42/?full_perms=true")
      expect(fetchMock).toHaveBeenCalledWith("/api/proxy/documents/42/metadata/")
      expect(screen.getByText("updated.pdf")).toBeInTheDocument()
    })
  })
})
