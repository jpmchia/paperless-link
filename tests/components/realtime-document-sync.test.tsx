import * as React from "react"
import { render, waitFor } from "@testing-library/react"
import { useSetAtom } from "jotai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RealtimeDocumentDetailSync } from "@/components/realtime-document-detail-sync"
import { RealtimeDocumentListSync } from "@/components/realtime-document-list-sync"
import { JotaiProvider } from "@/components/jotai-provider"
import { documentDetailsDirtyAtom } from "@/lib/store"
import type { RealtimeEvent } from "@/lib/realtime/events"
import { latestRealtimeEventAtom } from "@/lib/stores/realtime"

const { pushMock, refreshMock, toastErrorMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}))

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: toastErrorMock,
  }),
}))

function RealtimeSeed({
  event,
}: {
  event: RealtimeEvent | null
}) {
  const setLatestEvent = useSetAtom(latestRealtimeEventAtom)

  React.useEffect(() => {
    setLatestEvent(event ?? null)
  }, [event, setLatestEvent])

  return null
}

function DirtySeed({ dirty }: { dirty: boolean }) {
  const setDirty = useSetAtom(documentDetailsDirtyAtom)

  React.useEffect(() => {
    setDirty(dirty)
  }, [dirty, setDirty])

  return null
}

describe("realtime document sync", () => {
  beforeEach(() => {
    pushMock.mockReset()
    refreshMock.mockReset()
    toastErrorMock.mockReset()
  })

  it("refreshes document lists when a document update event arrives", async () => {
    render(
      <JotaiProvider>
        <RealtimeSeed event={{ documentId: 42, kind: "document-updated" }} />
        <RealtimeDocumentListSync />
      </JotaiProvider>
    )

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled()
    })
  })

  it("redirects away when the active document is deleted", async () => {
    render(
      <JotaiProvider>
        <DirtySeed dirty={false} />
        <RealtimeSeed event={{ documentId: 42, kind: "document-deleted" }} />
        <RealtimeDocumentDetailSync documentId={42} title="Invoice 42" />
      </JotaiProvider>
    )

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/documents")
    })
    expect(toastErrorMock).toHaveBeenCalled()
  })
})
