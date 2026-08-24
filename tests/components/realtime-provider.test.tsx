import * as React from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
import { useAtomValue } from "jotai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { JotaiProvider } from "@/components/jotai-provider"
import { RealtimeProvider } from "@/components/realtime-provider"
import { notificationsAtom } from "@/lib/stores/notifications"
import {
  activeRealtimeTasksAtom,
  latestRealtimeEventAtom,
  realtimeConnectionAtom,
} from "@/lib/stores/realtime"

const realtimeTestState = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createContext } = require("react") as typeof import("react")
  const SessionContext = createContext<{
    data: null
    status: "authenticated" | "unauthenticated"
  }>({
    data: null,
    status: "authenticated",
  })

  return {
    SessionContext,
    connectMock: vi.fn(),
    connectionListener: null as ((status: string) => void) | null,
    disconnectMock: vi.fn(),
    eventListener: null as ((event: unknown) => void) | null,
    sessionStatus: "authenticated" as "authenticated" | "unauthenticated",
    toastFn: Object.assign(vi.fn(), {
      error: vi.fn(),
      success: vi.fn(),
    }),
  }
})

vi.mock("next-auth/react", () => ({
  SessionContext: realtimeTestState.SessionContext,
  useSession: () => ({
    status: realtimeTestState.sessionStatus,
  }),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/documents",
}))

vi.mock("sonner", () => ({
  toast: realtimeTestState.toastFn,
}))

vi.mock("@/lib/realtime/client", () => ({
  getRealtimeClient: () => ({
    connect: realtimeTestState.connectMock,
    disconnect: realtimeTestState.disconnectMock,
    subscribeConnection: (listener: (status: string) => void) => {
      realtimeTestState.connectionListener = listener
      listener("idle")
      return () => {
        realtimeTestState.connectionListener = null
      }
    },
    subscribeEvents: (listener: (event: unknown) => void) => {
      realtimeTestState.eventListener = listener
      return () => {
        realtimeTestState.eventListener = null
      }
    },
  }),
}))

function RealtimeProbe() {
  const connection = useAtomValue(realtimeConnectionAtom)
  const latestEvent = useAtomValue(latestRealtimeEventAtom)
  const activeTasks = useAtomValue(activeRealtimeTasksAtom)
  const notifications = useAtomValue(notificationsAtom)

  return (
    <>
      <div data-testid="connection">{connection}</div>
      <div data-testid="event">{latestEvent ? JSON.stringify(latestEvent) : "none"}</div>
      <div data-testid="tasks">{JSON.stringify(activeTasks)}</div>
      <div data-testid="notifications">{JSON.stringify(notifications)}</div>
    </>
  )
}

function renderRealtime() {
  return render(
    <JotaiProvider>
      <realtimeTestState.SessionContext.Provider
        value={{
          data: null,
          status: realtimeTestState.sessionStatus,
        }}
      >
        <RealtimeProvider>
          <RealtimeProbe />
        </RealtimeProvider>
      </realtimeTestState.SessionContext.Provider>
    </JotaiProvider>
  )
}

describe("RealtimeProvider", () => {
  beforeEach(() => {
    realtimeTestState.connectMock.mockReset()
    realtimeTestState.disconnectMock.mockReset()
    realtimeTestState.toastFn.mockReset()
    realtimeTestState.toastFn.error.mockReset()
    realtimeTestState.toastFn.success.mockReset()
    realtimeTestState.sessionStatus = "authenticated"
    realtimeTestState.connectionListener = null
    realtimeTestState.eventListener = null
  })

  it("connects when authenticated and fans out task and notification events", async () => {
    renderRealtime()

    expect(realtimeTestState.connectMock).toHaveBeenCalled()

    act(() => {
      realtimeTestState.connectionListener?.("open")
      realtimeTestState.eventListener?.({
        kind: "task-progress",
        progress: 40,
        status: "STARTED",
        taskId: "task-1",
      })
      realtimeTestState.eventListener?.({
        kind: "document-consumed",
        documentId: 9,
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId("connection")).toHaveTextContent("open")
      expect(screen.getByTestId("tasks")).toHaveTextContent("task-1")
      expect(screen.getByTestId("notifications")).toHaveTextContent(
        "document-consumed"
      )
    })
  })

  it("disconnects when session becomes unauthenticated", async () => {
    const { rerender } = renderRealtime()

    expect(realtimeTestState.connectMock).toHaveBeenCalled()

    realtimeTestState.sessionStatus = "unauthenticated"
    rerender(
      <JotaiProvider>
        <realtimeTestState.SessionContext.Provider
          value={{
            data: null,
            status: "unauthenticated",
          }}
        >
          <RealtimeProvider>
            <RealtimeProbe />
          </RealtimeProvider>
        </realtimeTestState.SessionContext.Provider>
      </JotaiProvider>
    )

    await waitFor(() => {
      expect(realtimeTestState.disconnectMock).toHaveBeenCalled()
    })
  })
})
