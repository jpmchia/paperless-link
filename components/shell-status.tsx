"use client"

import { useAtomValue } from "jotai"
import { Wifi, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { realtimeConnectionAtom } from "@/lib/stores/realtime"

const STATUS_LABELS: Record<string, string> = {
  connected: "Live",
  connecting: "Connecting",
  disconnected: "Offline",
  error: "Error",
  idle: "Idle",
  unsupported: "No realtime",
}

export function ShellStatus() {
  const status = useAtomValue(realtimeConnectionAtom)
  const connected = status === "connected"

  return (
    <Badge
      variant={connected ? "outline" : "secondary"}
      className="hidden h-8 items-center gap-1 px-2 text-xs md:inline-flex"
    >
      {connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      {STATUS_LABELS[status]}
    </Badge>
  )
}
