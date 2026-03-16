"use client"

import { atom } from "jotai"
import type {
  RealtimeConnectionStatus,
  RealtimeEvent,
} from "@/lib/realtime/events"

export const realtimeConnectionAtom = atom<RealtimeConnectionStatus>("idle")
export const latestRealtimeEventAtom = atom<RealtimeEvent | null>(null)
