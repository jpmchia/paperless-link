import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  PaperlessRealtimeClient,
  resetRealtimeClientForTests,
} from "@/lib/realtime/client"

class FakeWebSocket {
  static instances: FakeWebSocket[] = []

  readonly url: string
  private listeners = new Map<string, Set<(event: { data?: string }) => void>>()

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  addEventListener(type: string, listener: (event: { data?: string }) => void) {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  close() {
    this.emit("close", {})
  }

  emit(type: string, event: { data?: string }) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }
}

describe("PaperlessRealtimeClient", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal("window", {
      clearTimeout,
      setTimeout,
    })
    vi.stubGlobal("WebSocket", FakeWebSocket)
    FakeWebSocket.instances = []
    resetRealtimeClientForTests()
  })

  it("reconnects with exponential backoff after unexpected close", () => {
    const client = new PaperlessRealtimeClient()
    const statuses: string[] = []

    client.subscribeConnection((status) => {
      statuses.push(status)
    })

    client.connect("ws://paperless.test/ws")
    expect(FakeWebSocket.instances).toHaveLength(1)

    FakeWebSocket.instances[0].emit("open", {})
    FakeWebSocket.instances[0].emit("close", {})

    expect(FakeWebSocket.instances).toHaveLength(1)

    vi.advanceTimersByTime(999)
    expect(FakeWebSocket.instances).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(FakeWebSocket.instances).toHaveLength(2)

    FakeWebSocket.instances[1].emit("close", {})

    vi.advanceTimersByTime(1999)
    expect(FakeWebSocket.instances).toHaveLength(2)

    vi.advanceTimersByTime(1)
    expect(FakeWebSocket.instances).toHaveLength(3)

    expect(statuses).toEqual([
      "idle",
      "connecting",
      "connected",
      "disconnected",
      "connecting",
      "disconnected",
      "connecting",
    ])
  })

  it("cancels pending reconnect when manually disconnected", () => {
    const client = new PaperlessRealtimeClient()
    const statuses: string[] = []

    client.subscribeConnection((status) => {
      statuses.push(status)
    })

    client.connect("ws://paperless.test/ws")
    FakeWebSocket.instances[0].emit("close", {})

    client.disconnect()
    vi.advanceTimersByTime(30000)

    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(statuses.at(-1)).toBe("disconnected")
  })

  it("emits normalized and raw message events", () => {
    const client = new PaperlessRealtimeClient()
    const events: unknown[] = []

    client.subscribeEvents((event) => {
      events.push(event)
    })

    client.connect("ws://paperless.test/ws")

    FakeWebSocket.instances[0].emit("message", {
      data: JSON.stringify({
        data: {
          document_id: 42,
          filename: "invoice.pdf",
          status: "SUCCESS",
          task_id: "task-1",
        },
        event: "status_update",
      }),
    })

    FakeWebSocket.instances[0].emit("message", {
      data: "not-json",
    })

    expect(events).toEqual([
      {
        documentId: 42,
        filename: "invoice.pdf",
        kind: "document-consumed",
        status: "SUCCESS",
        taskId: "task-1",
      },
      {
        kind: "raw",
        payload: "not-json",
      },
    ])
  })

  it("marks the client unsupported when no websocket URL is available", () => {
    const client = new PaperlessRealtimeClient()
    const statuses: string[] = []

    client.subscribeConnection((status) => {
      statuses.push(status)
    })

    client.connect(null)

    expect(FakeWebSocket.instances).toHaveLength(0)
    expect(statuses).toEqual(["idle", "unsupported"])
  })
})
