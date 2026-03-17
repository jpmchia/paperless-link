import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useSetAtom } from "jotai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { JotaiProvider } from "@/components/jotai-provider"
import { SystemStatusView } from "@/app/system-status/system-status-view"
import {
  latestRealtimeEventAtom,
  realtimeConnectionAtom,
} from "@/lib/stores/realtime"
import type { SystemStatus } from "@/lib/system-status"

const getJsonMock = vi.fn()
const postJsonMock = vi.fn()

vi.mock("@/lib/paperless-client", () => ({
  getJson: (...args: unknown[]) => getJsonMock(...args),
  postJson: (...args: unknown[]) => postJsonMock(...args),
}))

const statusFixture: SystemStatus = {
  database: {
    migration_status: {
      latest_migration: "0012_add_indexes",
      unapplied_migrations: [],
    },
    status: "OK",
    type: "postgresql",
    url: "postgres://paperless",
  },
  install_type: "containerized",
  pngx_version: "2.14.0",
  server_os: "Linux",
  storage: {
    available: 5000,
    total: 10000,
  },
  tasks: {
    celery_status: "OK",
    classifier_last_trained: "2026-03-16T10:00:00Z",
    classifier_status: "OK",
    index_last_modified: "2026-03-16T11:00:00Z",
    index_status: "OK",
    redis_status: "OK",
    sanity_check_last_run: "2026-03-15T11:00:00Z",
    sanity_check_status: "WARNING",
  },
}

function RealtimeControls() {
  const setConnection = useSetAtom(realtimeConnectionAtom)
  const setLatestEvent = useSetAtom(latestRealtimeEventAtom)

  return (
    <>
      <button type="button" onClick={() => setConnection("connected")}>
        Connect
      </button>
      <button
        type="button"
        onClick={() =>
          setLatestEvent({
            kind: "task-progress",
            message: "Processing",
            status: "STARTED",
            taskId: "task-1",
          })
        }
      >
        Push Task Event
      </button>
    </>
  )
}

describe("SystemStatusView", () => {
  beforeEach(() => {
    getJsonMock.mockReset()
    postJsonMock.mockReset()
  })

  it("renders environment and health details", () => {
    render(
      <JotaiProvider>
        <SystemStatusView
          canRunTasks={false}
          frontendVersion="2.14.0"
          initialStatus={statusFixture}
        />
      </JotaiProvider>
    )

    expect(screen.getByText("Environment")).toBeInTheDocument()
    expect(screen.getByText("postgresql")).toBeInTheDocument()
    expect(screen.getByText("Realtime idle")).toBeInTheDocument()
  })

  it("runs a maintenance task and refreshes status", async () => {
    postJsonMock.mockResolvedValue({ task_id: "job-1" })
    getJsonMock.mockResolvedValue(statusFixture)

    render(
      <JotaiProvider>
        <SystemStatusView
          canRunTasks
          frontendVersion="2.14.0"
          initialStatus={statusFixture}
        />
      </JotaiProvider>
    )

    fireEvent.click(screen.getByText("Optimize search index"))

    await waitFor(() => {
      expect(postJsonMock).toHaveBeenCalledWith("/api/tasks/run", {
        task_name: "index_optimize",
      })
    })

    await waitFor(() => {
      expect(getJsonMock).toHaveBeenCalledWith("/api/system-status")
    })
  })

  it("refreshes automatically when realtime reconnects", async () => {
    getJsonMock.mockResolvedValue(statusFixture)

    render(
      <JotaiProvider>
        <RealtimeControls />
        <SystemStatusView
          canRunTasks={false}
          frontendVersion="2.14.0"
          initialStatus={statusFixture}
        />
      </JotaiProvider>
    )

    fireEvent.click(screen.getByText("Connect"))

    await waitFor(() => {
      expect(getJsonMock).toHaveBeenCalledWith("/api/system-status")
    })
  })

  it("refreshes automatically on realtime task updates", async () => {
    getJsonMock.mockResolvedValue(statusFixture)

    render(
      <JotaiProvider>
        <RealtimeControls />
        <SystemStatusView
          canRunTasks={false}
          frontendVersion="2.14.0"
          initialStatus={statusFixture}
        />
      </JotaiProvider>
    )

    fireEvent.click(screen.getByText("Push Task Event"))

    await waitFor(() => {
      expect(getJsonMock).toHaveBeenCalledWith("/api/system-status")
    })
  })
})
