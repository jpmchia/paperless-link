import {
  normalizeRealtimeEvent,
  type RealtimeConnectionStatus,
  type RealtimeEvent,
} from "@/lib/realtime/events"

type ConnectionListener = (status: RealtimeConnectionStatus) => void
type EventListener = (event: RealtimeEvent) => void

const INITIAL_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30000

export class PaperlessRealtimeClient {
  private connectionGeneration = 0
  private connectionListeners = new Set<ConnectionListener>()
  private eventListeners = new Set<EventListener>()
  private manualDisconnect = false
  private reconnectAttempt = 0
  private reconnectTimer: number | null = null
  private requestedUrl: string | null = null
  private socket: WebSocket | null = null
  private status: RealtimeConnectionStatus = "idle"

  private clearReconnectTimer() {
    if (this.reconnectTimer == null || typeof window === "undefined") return
    window.clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private getReconnectDelay() {
    return Math.min(
      INITIAL_RECONNECT_DELAY_MS * 2 ** Math.max(0, this.reconnectAttempt - 1),
      MAX_RECONNECT_DELAY_MS
    )
  }

  private isActiveSocket(socket: WebSocket, generation: number) {
    return this.socket === socket && this.connectionGeneration === generation
  }

  private notifyConnection(status: RealtimeConnectionStatus) {
    if (this.status === status) return
    this.status = status
    for (const listener of this.connectionListeners) listener(status)
  }

  private notifyEvent(event: RealtimeEvent) {
    for (const listener of this.eventListeners) listener(event)
  }

  private scheduleReconnect() {
    if (
      this.manualDisconnect ||
      !this.requestedUrl ||
      this.reconnectTimer != null ||
      typeof window === "undefined"
    ) {
      return
    }

    this.reconnectAttempt += 1
    const delay = this.getReconnectDelay()

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null

      if (this.manualDisconnect || this.socket || !this.requestedUrl) return

      this.openSocket()
    }, delay)
  }

  private openSocket() {
    if (
      typeof window === "undefined" ||
      !this.requestedUrl ||
      this.socket
    ) {
      return
    }

    const generation = this.connectionGeneration + 1
    const socket = new WebSocket(this.requestedUrl)

    this.connectionGeneration = generation
    this.socket = socket
    this.notifyConnection("connecting")

    socket.addEventListener("open", () => {
      if (!this.isActiveSocket(socket, generation)) return

      this.clearReconnectTimer()
      this.reconnectAttempt = 0
      this.notifyConnection("connected")
    })

    socket.addEventListener("close", () => {
      if (!this.isActiveSocket(socket, generation)) return

      this.socket = null

      if (this.manualDisconnect || !this.requestedUrl) {
        this.notifyConnection("disconnected")
        return
      }

      this.notifyConnection("disconnected")
      this.scheduleReconnect()
    })

    socket.addEventListener("error", () => {
      if (!this.isActiveSocket(socket, generation)) return
      this.notifyConnection("error")
    })

    socket.addEventListener("message", (message) => {
      if (!this.isActiveSocket(socket, generation)) return

      try {
        const payload = JSON.parse(message.data)
        const event = normalizeRealtimeEvent(payload)
        if (event) this.notifyEvent(event)
      } catch {
        this.notifyEvent({ kind: "raw", payload: message.data })
      }
    })
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
      this.requestedUrl = null
      this.manualDisconnect = true
      this.clearReconnectTimer()

      if (this.socket) {
        const socket = this.socket
        this.socket = null
        socket.close()
      }

      this.notifyConnection("unsupported")
      return
    }

    if (typeof window === "undefined") return

    this.requestedUrl = url
    this.manualDisconnect = false
    this.clearReconnectTimer()

    if (this.socket) return

    this.openSocket()
  }

  disconnect() {
    this.manualDisconnect = true
    this.requestedUrl = null
    this.reconnectAttempt = 0
    this.clearReconnectTimer()

    if (this.socket) {
      const socket = this.socket
      this.socket = null
      socket.close()
    }

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

export function resetRealtimeClientForTests() {
  realtimeClient = null
}
