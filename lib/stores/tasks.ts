"use client"

import { atom } from "jotai"

export interface ShellTaskSummary {
  acknowledged: boolean
  status: string
}

export function countPendingTasks(tasks: ShellTaskSummary[]) {
  return tasks.filter(
    (task) =>
      !task.acknowledged &&
      (task.status === "PENDING" || task.status === "STARTED")
  ).length
}

export const pendingTaskCountAtom = atom(0)

export const setPendingTaskCountAtom = atom(null, (_get, set, count: number) => {
  set(pendingTaskCountAtom, Math.max(0, count))
})

export const adjustPendingTaskCountAtom = atom(
  null,
  (get, set, delta: number) => {
    set(pendingTaskCountAtom, Math.max(0, get(pendingTaskCountAtom) + delta))
  }
)
