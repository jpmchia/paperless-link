import {
  normalizeRealtimeEvent,
  type RealtimeConnectionStatus,
  type RealtimeEvent,
} from "@/lib/realtime/events"

type ConnectionListener = (status: RealtimeConnectionStatus) => void
type EventListener = (event: RealtimeEvent) => void

class PaperlessRealtimeClient {
  private connectionListeners = new Set<ConnectionListener>()
  private eventListeners = new Set<EventListener>()
  private socket: WebSocket | null = null
  private status: RealtimeConnectionStatus = "idle"

  private notifyConnection(status: RealtimeConnectionStatus) {
    this.status = status
    for (const listener of this.connectionListeners) listener(status)
  }

  private notifyEvent(event: RealtimeEvent) {
    for (const listener of this.eventListeners) listener(event)
  }

  getStatus() {
    return this.status
  }

  subscribeConnection(listener: ConnectionListener) {
    this.connectionListeners.add(listener)
    listener(this.status)
    return () => this.connectionListeners.delete(listener)
  }

  subscribeEvents(listener: EventListener) {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  connect(url: string | null | undefined) {
    if (!url) {
      this.notifyConnection("unsupported")
      return
    }

    if (typeof window === "undefined") return
    if (this.socket) return

    this.notifyConnection("connecting")
    this.socket = new WebSocket(url)

    this.socket.addEventListener("open", () => {
      this.notifyConnection("connected")
    })

    this.socket.addEventListener("close", () => {
      this.socket = null
      this.notifyConnection("disconnected")
    })

    this.socket.addEventListener("error", () => {
      this.notifyConnection("error")
    })

    this.socket.addEventListener("message", (message) => {
      try {
        const payload = JSON.parse(message.data)
        const event = normalizeRealtimeEvent(payload)
        if (event) this.notifyEvent(event)
      } catch {
        this.notifyEvent({ kind: "raw", payload: message.data })
      }
    })
  }

  disconnect() {
    this.socket?.close()
    this.socket = null
    this.notifyConnection("disconnected")
  }
}

let realtimeClient: PaperlessRealtimeClient | null = null

export function getRealtimeClient() {
  if (!realtimeClient) {
    realtimeClient = new PaperlessRealtimeClient()
  }

  return realtimeClient
}
