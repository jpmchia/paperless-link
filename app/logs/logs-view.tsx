"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { toErrorMessage } from "@/lib/errors"
import { getJson } from "@/lib/paperless-client"

export function LogsView() {
  const [logs, setLogs] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const fetchLogs = React.useCallback(async () => {
    try {
      const data = await getJson<string[]>("/api/logs")
      setLogs(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error("Failed to load logs", {
        description: toErrorMessage(error),
      })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-shrink-0">
        <p className="text-sm text-muted-foreground">
          {logs.length} log entries
        </p>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 rounded-md border bg-muted/30 overflow-auto p-4 font-mono text-xs leading-5"
      >
        {logs.length === 0 ? (
          <span className="text-muted-foreground">No log entries available.</span>
        ) : (
          logs.map((line, i) => (
            <div
              key={i}
              className={`py-0.5 ${
                line.includes("[ERROR]") || line.includes("ERROR")
                  ? "text-destructive"
                  : line.includes("[WARNING]") || line.includes("WARNING")
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-foreground"
              }`}
            >
              {line}
            </div>
          ))
        )}
      </div>
    </>
  )
}
