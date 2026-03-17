"use client"

import { atom } from "jotai"
import type {
  RealtimeConnectionStatus,
  RealtimeEvent,
} from "@/lib/realtime/events"

export const realtimeConnectionAtom = atom<RealtimeConnectionStatus>("idle")
export const latestRealtimeEventAtom = atom<RealtimeEvent | null>(null)

export interface ActiveRealtimeTask {
  currentProgress?: number
  documentId?: number
  filename?: string
  maxProgress?: number
  message?: string
  status?: string
  taskId: string
  updatedAt: string
}

export const activeRealtimeTasksAtom = atom<Record<string, ActiveRealtimeTask>>(
  {}
)

export const upsertRealtimeTaskAtom = atom(
  null,
  (
    get,
    set,
    task: Omit<ActiveRealtimeTask, "updatedAt"> & { taskId: string }
  ) => {
    set(activeRealtimeTasksAtom, {
      ...get(activeRealtimeTasksAtom),
      [task.taskId]: {
        ...task,
        updatedAt: new Date().toISOString(),
      },
    })
  }
)

export const removeRealtimeTaskAtom = atom(
  null,
  (get, set, taskId: string | null | undefined) => {
    if (!taskId) return

    const nextTasks = { ...get(activeRealtimeTasksAtom) }
    delete nextTasks[taskId]
    set(activeRealtimeTasksAtom, nextTasks)
  }
)
