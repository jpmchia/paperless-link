"use client"

import * as React from "react"

const LLM_ACTIVITY_STORAGE_KEY = "paperless-link.llm-activity"
const LLM_ACTIVITY_EVENT = "paperless-link:llm-activity-updated"
const MAX_EXECUTION_ENTRIES = 200

export type LLMExecutionEntry = {
  execution_id: string
  source: "ai.model.run" | "ai.process.run"
  trigger: string
  process_key?: string
  process_label?: string
  provider_id?: string
  provider_label?: string
  model_id?: string
  model_label?: string
  prompt: string
  output_text?: string
  error?: string
  generated_at: string
}

function readExecutionEntries() {
  if (typeof window === "undefined") return [] as LLMExecutionEntry[]

  try {
    const stored = window.localStorage.getItem(LLM_ACTIVITY_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as LLMExecutionEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeExecutionEntries(entries: LLMExecutionEntry[]) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(
    LLM_ACTIVITY_STORAGE_KEY,
    JSON.stringify(entries.slice(0, MAX_EXECUTION_ENTRIES))
  )
  window.dispatchEvent(new Event(LLM_ACTIVITY_EVENT))
}

function buildExecutionID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `llm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function appendLLMExecutionEntry(
  entry: Omit<LLMExecutionEntry, "execution_id" | "generated_at"> & {
    execution_id?: string
    generated_at?: string
  }
) {
  const nextEntry: LLMExecutionEntry = {
    ...entry,
    execution_id: entry.execution_id || buildExecutionID(),
    generated_at: entry.generated_at || new Date().toISOString(),
  }

  const currentEntries = readExecutionEntries().filter(
    (current) => current.execution_id !== nextEntry.execution_id
  )
  writeExecutionEntries([nextEntry, ...currentEntries])
  return nextEntry
}

type ExecutionFilter = {
  model_ids?: string[]
  process_key?: string
}

function matchesFilter(entry: LLMExecutionEntry, filter?: ExecutionFilter) {
  if (!filter) return true
  if (filter.process_key && entry.process_key !== filter.process_key) {
    return false
  }
  if (filter.model_ids?.length) {
    return filter.model_ids.includes(entry.model_id || "")
  }
  return true
}

export function useLLMExecutionEntries(filter?: ExecutionFilter) {
  const [entries, setEntries] = React.useState<LLMExecutionEntry[]>([])

  React.useEffect(() => {
    const syncEntries = () => setEntries(readExecutionEntries())

    syncEntries()
    window.addEventListener(LLM_ACTIVITY_EVENT, syncEntries)
    window.addEventListener("storage", syncEntries)

    return () => {
      window.removeEventListener(LLM_ACTIVITY_EVENT, syncEntries)
      window.removeEventListener("storage", syncEntries)
    }
  }, [])

  return React.useMemo(
    () => entries.filter((entry) => matchesFilter(entry, filter)),
    [entries, filter]
  )
}
