"use client"

import * as React from "react"
import { Progress } from "@/components/ui/progress"
import { normalizeTaskProgress } from "@/lib/paperless-tasks"

export type TaskProgressProps = {
  current?: number
  max?: number
  percent?: number
  status?: string
  label?: string
}

export function TaskProgress({
  current,
  max,
  percent,
  status,
  label,
}: TaskProgressProps) {
  const normalized =
    percent != null && current != null && max != null
      ? { current, max, percent }
      : normalizeTaskProgress({ current, max })

  const isRunning =
    status === "STARTED" ||
    status === "PENDING" ||
    status === "WORKING" ||
    status === "started" ||
    status === "pending"

  if (!normalized && !isRunning) return null

  if (!normalized) {
    return (
      <div className="space-y-1" aria-busy="true" aria-label={label ?? "Task in progress"}>
        <Progress value={undefined} className="h-1.5" />
        <p className="text-[10px] text-muted-foreground">In progress…</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Progress
        value={normalized.percent}
        className="h-1.5"
        aria-valuenow={normalized.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `Task progress ${normalized.percent}%`}
      />
      <p className="text-[10px] text-muted-foreground">
        {normalized.current} / {normalized.max} ({normalized.percent}%)
      </p>
    </div>
  )
}
