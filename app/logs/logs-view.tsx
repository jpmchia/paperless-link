"use client"

import * as React from "react"
import { useAtomValue } from "jotai"
import { Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toErrorMessage } from "@/lib/errors"
import { getJson, withQuery } from "@/lib/paperless-client"
import { latestRealtimeEventAtom } from "@/lib/stores/realtime"

interface ParsedLogLine {
  level: number
  message: string
}

function getLogLevel(log: string) {
  if (log.includes("[DEBUG]")) return 10
  if (log.includes("[WARNING]")) return 30
  if (log.includes("[ERROR]")) return 40
  if (log.includes("[CRITICAL]")) return 50
  return 20
}

function parseLogsWithLevel(logs: string[]): ParsedLogLine[] {
  return logs.map((log) => ({
    level: getLogLevel(log),
    message: log,
  }))
}

function hasLogChanges(current: ParsedLogLine[], next: ParsedLogLine[]) {
  return (
    current.length !== next.length ||
    next.some((log, index) => {
      const currentLine = current[index]
      return (
        !currentLine ||
        currentLine.level !== log.level ||
        currentLine.message !== log.message
      )
    })
  )
}

export function LogsView() {
  const latestRealtimeEvent = useAtomValue(latestRealtimeEventAtom)
  const [activeLog, setActiveLog] = React.useState<string>("")
  const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(true)
  const [limit, setLimit] = React.useState(5000)
  const [limitInput, setLimitInput] = React.useState("5000")
  const [loadingFiles, setLoadingFiles] = React.useState(true)
  const [loadingLog, setLoadingLog] = React.useState(false)
  const [logFiles, setLogFiles] = React.useState<string[]>([])
  const [logs, setLogs] = React.useState<ParsedLogLine[]>([])
  const [showJumpToBottom, setShowJumpToBottom] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const isNearBottom = React.useCallback(() => {
    const viewport = scrollRef.current
    if (!viewport) return true

    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight

    return distanceFromBottom <= 40
  }, [])

  const scrollToBottom = React.useCallback(() => {
    const viewport = scrollRef.current
    if (!viewport) return
    viewport.scrollTop = viewport.scrollHeight
    setShowJumpToBottom(false)
  }, [])

  const fetchLogFiles = React.useCallback(async () => {
    setLoadingFiles(true)
    try {
      const data = await getJson<string[]>("/api/logs")
      const nextFiles = Array.isArray(data) ? data : []
      setLogFiles(nextFiles)
      setActiveLog((current) =>
        current && nextFiles.includes(current) ? current : nextFiles[0] ?? ""
      )
    } catch (error) {
      toast.error("Failed to load log files", {
        description: toErrorMessage(error),
      })
    } finally {
      setLoadingFiles(false)
    }
  }, [])

  const fetchLogs = React.useCallback(
    async (logFile = activeLog, lineLimit = limit) => {
      if (!logFile) {
        setLogs([])
        return
      }

      setLoadingLog(true)
      const shouldStickToBottom = isNearBottom()

      try {
        const data = await getJson<string[]>(
          withQuery("/api/logs", {
            file: logFile,
            limit: lineLimit,
          })
        )
        const parsed = parseLogsWithLevel(Array.isArray(data) ? data : [])

        setLogs((current) => {
          if (!hasLogChanges(current, parsed)) {
            return current
          }

          window.requestAnimationFrame(() => {
            if (shouldStickToBottom) {
              scrollToBottom()
            } else {
              setShowJumpToBottom(true)
            }
          })

          return parsed
        })
      } catch (error) {
        setLogs([])
        toast.error("Failed to load logs", {
          description: toErrorMessage(error),
        })
      } finally {
        setLoadingLog(false)
      }
    },
    [activeLog, isNearBottom, limit, scrollToBottom]
  )

  React.useEffect(() => {
    void fetchLogFiles()
  }, [fetchLogFiles])

  React.useEffect(() => {
    if (!activeLog) return
    void fetchLogs(activeLog, limit)
  }, [activeLog, fetchLogs, limit])

  React.useEffect(() => {
    const nextLimit = Number(limitInput)
    if (!Number.isFinite(nextLimit) || nextLimit < 100) return

    const timeout = window.setTimeout(() => {
      setLimit(nextLimit)
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [limitInput])

  React.useEffect(() => {
    if (!autoRefreshEnabled || !activeLog) return

    const interval = window.setInterval(() => {
      void fetchLogs(activeLog, limit)
    }, 5000)

    return () => window.clearInterval(interval)
  }, [activeLog, autoRefreshEnabled, fetchLogs, limit])

  React.useEffect(() => {
    if (!activeLog) return

    switch (latestRealtimeEvent?.kind) {
      case "task-progress":
      case "document-detected":
      case "document-consumed":
      case "document-failed":
        void fetchLogs(activeLog, limit)
        break
      default:
        break
    }
  }, [activeLog, fetchLogs, latestRealtimeEvent, limit])

  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <div>
            <CardTitle>Logs</CardTitle>
            <p className="text-xs text-muted-foreground">
              Inspect Paperless backend log files with live refresh.
            </p>
          </div>
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchLogs(activeLog, limit)}
              disabled={!activeLog || loadingLog}
            >
              {loadingLog ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
              )}
              Refresh
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Show</span>
              <Input
                className="w-24"
                min={100}
                step={100}
                type="number"
                value={limitInput}
                onChange={(event) => setLimitInput(event.target.value)}
              />
              <span className="text-muted-foreground">lines</span>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={autoRefreshEnabled}
                onCheckedChange={setAutoRefreshEnabled}
              />
              <span>Auto refresh</span>
            </label>
          </div>

          <Tabs
            className="min-h-0 flex-1"
            value={activeLog}
            onValueChange={(value) => setActiveLog(value)}
          >
            <div className="overflow-x-auto">
              <TabsList variant="line" className="min-w-max justify-start border-b p-0">
                {logFiles.map((logFile) => (
                  <TabsTrigger key={logFile} value={logFile} className="gap-1.5 px-3">
                    {logFile}.log
                  </TabsTrigger>
                ))}
                {(loadingFiles || logFiles.length === 0) && (
                  <div className="flex items-center gap-2 px-3 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {loadingFiles ? "Loading..." : "No logs available"}
                  </div>
                )}
              </TabsList>
            </div>

            {activeLog ? (
              <TabsContent value={activeLog} className="m-0">
                <Card className="bg-slate-950 text-slate-100 ring-0">
                  <CardContent
                    ref={scrollRef}
                    className="min-h-0 max-h-[70vh] overflow-auto p-4 font-mono text-xs leading-5"
                    onScroll={() => setShowJumpToBottom(!isNearBottom())}
                  >
                    {logs.length === 0 ? (
                      <span className="text-slate-400">No log entries available.</span>
                    ) : (
                      logs.map((log, index) => (
                        <p
                          key={`${index}-${log.message}`}
                          className={
                            log.level >= 50
                              ? "text-red-400"
                              : log.level >= 40
                                ? "text-red-300"
                                : log.level >= 30
                                  ? "text-yellow-300"
                                  : log.level <= 10
                                    ? "text-sky-300"
                                    : "text-slate-100"
                          }
                        >
                          {log.message}
                        </p>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ) : (
              <Card className="bg-slate-950 text-slate-100 ring-0">
                <CardContent className="min-h-0 max-h-[70vh] p-4 font-mono text-xs leading-5">
                  {loadingFiles ? (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <span className="text-slate-400">No log entries available.</span>
                  )}
                </CardContent>
              </Card>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        className={`fixed bottom-6 right-6 shadow-lg transition-opacity ${
          showJumpToBottom ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={scrollToBottom}
      >
        Jump to bottom
      </Button>
    </>
  )
}
